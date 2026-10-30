// Contract tests exercise the real Supabase SDK with an intercepted test service.
// No real credentials, mail, or user data. Build using the test env in ci.yml.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../out');
const authOrigin = 'https://auth-test.example';
const account = '/STATIC-THREADS/account/';
const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'wardrobe@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
function session(expired = false) {
  const expires = Math.floor(Date.now() / 1000) + (expired ? -100 : 3600);
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: expires, iat: expires - 3600 })}.test-signature`, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expires, user };
}
const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/STATIC-THREADS(?=\/|$)/, '') || '/';
  let file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep) && file !== root) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
  const runnerChrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].filter(Boolean).find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(runnerChrome ? { executablePath: runnerChrome } : {}) });
  const origin = 'http://127.0.0.1:4175';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let otp = null, exchanges = 0, refreshes = 0, logouts = 0, failUser = false, failOtp = false, failLogout = false;
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route(`${authOrigin}/**`, async route => {
    const req = route.request();
    const url = new URL(req.url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '' });
    let status = 200, body = {};
    if (url.pathname.endsWith('/otp')) {
      otp = { body: req.postDataJSON(), redirect: url.searchParams.get('redirect_to') };
      if (failOtp) { status = 429; body = { code: 'over_email_send_rate_limit', msg: 'private service error not for UI' }; }
    } else if (url.pathname.endsWith('/token')) {
      const data = req.postDataJSON();
      if (url.searchParams.get('grant_type') === 'pkce') {
        exchanges++;
        assert.ok(data.code_verifier, 'PKCE verifier missing');
        if (data.auth_code === 'expired') { status = 400; body = { code: 'flow_state_expired', msg: 'expired' }; }
        else body = session();
      } else { refreshes++; body = session(); }
    } else if (url.pathname.endsWith('/user')) {
      assert.ok(req.headers().authorization?.startsWith('Bearer '));
      status = failUser ? 401 : 200;
      body = failUser ? { code: 'bad_jwt', msg: 'Invalid token' } : user;
    } else if (url.pathname.endsWith('/logout')) {
      logouts++;
      assert.equal(url.searchParams.get('scope'), 'local');
      status = failLogout ? 500 : 204;
      body = failLogout ? { message: 'offline' } : null;
    } else throw new Error(`Unexpected auth request ${url.pathname}`);
    await route.fulfill({ status, headers, body: body === null ? '' : JSON.stringify(body) });
  });
  try {
    const page = await context.newPage();
    await page.goto(origin + account);
    await page.getByLabel('Email', { exact: true }).waitFor();
    assert.equal(await page.title(), 'Static Threads');
    assert.equal(await page.getByRole('button', { name: 'Sign out of this browser' }).count(), 0);
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByRole('button', { name: 'Send secure sign-in link' }).click();
    await page.getByText('Check your email for the sign-in link.', { exact: false }).waitFor();
    assert.equal(otp.body.email, user.email);
    assert.equal(otp.redirect, origin + account);
    assert.ok(otp.body.code_challenge, 'PKCE challenge missing');
    assert.equal(otp.body.code_challenge_method, 's256');
    assert.equal(await page.getByRole('button', { name: /^Resend in/ }).isDisabled(), true);
    await page.goto(origin + account + '?code=valid&keep=1');
    await page.getByText('Signed in as', { exact: false }).waitFor();
    assert.equal(new URL(page.url()).search, '?keep=1');
    assert.equal(exchanges, 1);
    await page.screenshot({ path: '/tmp/static-threads-auth-qa/signed-in-mobile.png', fullPage: true });
    await page.reload();
    await page.getByText('Signed in as', { exact: false }).waitFor();
    assert.equal(exchanges, 1, 'Callback exchanged twice');
    const tab = await context.newPage();
    await tab.goto(origin + account);
    await tab.getByText('Signed in as', { exact: false }).waitFor();
    failLogout = true;
    await page.getByRole('button', { name: 'Sign out of this browser' }).click();
    await page.getByRole('alert').filter({ hasText: "couldn't sign you out" }).waitFor();
    assert.equal(await page.getByText('Signed in as', { exact: false }).count(), 1);
    failLogout = false;
    await page.getByRole('button', { name: 'Sign out of this browser' }).click();
    await page.getByLabel('Email', { exact: true }).waitFor();
    await tab.getByLabel('Email', { exact: true }).waitFor();
    assert.ok(logouts >= 2);
    await page.reload();
    await page.getByLabel('Email', { exact: true }).waitFor();
    // Malicious/stale cached identity never authorizes the rendered account.
    const storageKey = await page.evaluate(() => Object.keys(localStorage).find(key => key.endsWith('-auth-token')) || 'sb-auth-test-auth-token');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: session() });
    failUser = true;
    await page.reload();
    await page.getByLabel('Email', { exact: true }).waitFor();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Sign out of this browser' }).count(), 0);
    failUser = false;
    // An expired access token is refreshed through the SDK, then server-verified.
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: session(true) });
    await page.reload();
    await page.getByText('Signed in as', { exact: false }).waitFor();
    assert.ok(refreshes > 0, 'No token refresh');
    await page.getByRole('button', { name: 'Sign out of this browser' }).click();
    await page.getByLabel('Email', { exact: true }).waitFor();
    // Invalid code and provider error both offer recovery and remove URL credentials.
    await page.goto(origin + account + '?code=expired');
    await page.getByRole('alert').filter({ hasText: 'invalid or has expired' }).waitFor();
    assert.equal(new URL(page.url()).search, '');
    await page.goto(origin + account + '#error=access_denied&error_description=private-secret');
    await page.getByRole('alert').filter({ hasText: 'invalid or has expired' }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    assert.equal((await page.locator('body').innerText()).includes('private-secret'), false);
    failOtp = true;
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByRole('button', { name: 'Send secure sign-in link' }).click();
    await page.getByRole('alert').filter({ hasText: 'Too many requests' }).waitFor();
    assert.equal((await page.locator('body').innerText()).includes('private service error'), false);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: '/tmp/static-threads-auth-qa/link-error-desktop.png', fullPage: true });
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Account overflows ${width}`);
    }
    assert.ok(!/Application error|Internal Server Error/.test(await page.locator('body').innerText()));
    assert.deepEqual(errors, []);
    console.log('PASS: PKCE request/callback, reload, second tab, logout/failure, invalid identity, refresh, expired/error callback, rate limit, URL cleanup and responsive account.');
  } finally { await context.close(); await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
