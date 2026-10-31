// Browser QA for the local chatbot, with optional intercepted personal data contracts.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../out');
const base = 'http://127.0.0.1:4176/STATIC-THREADS/';
const shots = '/tmp/static-threads-chat-qa';
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, base).pathname).replace(/^\/STATIC-THREADS(?=\/|$)/, '') || '/';
  let file = path.resolve(root, `.${name}`);
  if (!file.startsWith(root + path.sep) && file !== root) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const uid = '00000000-0000-4000-8000-000000000001';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'planner@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const row = (id, category) => ({ id, user_id: uid, name: `Private ${category}`, category, subcategory: '', primary_colour: 'Blue', secondary_colours: [], material: 'Unknown', occasions: ['casual'], status: 'available' });
const privateItems = [row('00000000-0000-4000-8000-000000000011', 'dresses'), row('00000000-0000-4000-8000-000000000012', 'shoes')];
function testSession() {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return { access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: uid, aud: 'authenticated', exp: expires })}.test`, refresh_token: 'test', expires_in: 3600, expires_at: expires, token_type: 'bearer', user };
}
(async () => {
  fs.mkdirSync(shots, { recursive: true });
  await new Promise(resolve => server.listen(4176, '127.0.0.1', resolve));
  const runnerChrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(runnerChrome ? { executablePath: runnerChrome } : {}) });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  try {
    const page = await context.newPage();
    await page.goto(base);
    assert.equal(await page.title(), 'Static Threads');
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.ok(!/Application error|Internal Server Error/.test(await page.locator('body').innerText()));
    const launcher = page.getByRole('button', { name: 'Plan an outfit', exact: true });
    const dock = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
    for (const width of [320, 390, 680]) {
      await page.setViewportSize({ width, height: 844 });
      const launchBox = await launcher.boundingBox(), dockBox = await dock.boundingBox();
      assert.ok(launchBox.y + launchBox.height < dockBox.y, `Launcher overlaps dock at ${width}`);
    }
    await launcher.click();
    const dialog = page.getByRole('dialog', { name: 'Your outfit planner' });
    await dialog.waitFor();
    await dialog.getByText('Demo wardrobe', { exact: true }).waitFor();
    async function send(text) {
      await dialog.getByLabel('Tell the planner').fill(text);
      await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    }
    await send('Plan my outfit for a wedding');
    await dialog.getByText(/What is the dress code for your wedding/).waitFor();
    await dialog.getByRole('button', { name: 'Formal', exact: true }).click();
    await dialog.getByRole('button', { name: 'Indoors', exact: true }).click();
    await dialog.getByText(/I can't build a complete formal outfit/).waitFor();
    assert.equal(await dialog.getByRole('article').count(), 0);
    await dialog.getByRole('button', { name: 'New plan' }).click();
    await send('Dinner smart casual indoors no black');
    await dialog.getByRole('heading', { name: 'Option 1', exact: true }).waitFor();
    const firstNames = await dialog.locator('.outfit-chat-outfit').first().locator('li strong').allTextContents();
    assert.ok(firstNames.length >= 3);
    assert.ok(firstNames.every(name => !name.toLowerCase().includes('black')));
    await dialog.getByRole('button', { name: 'Save outfit', exact: true }).first().click();
    await dialog.getByRole('status').filter({ hasText: 'Demo outfit saved on this browser.' }).waitFor();
    await dialog.getByRole('button', { name: 'Wore this', exact: true }).first().click();
    await dialog.getByRole('status').filter({ hasText: 'Demo wear event recorded on this browser.' }).waitFor();
    const actionData = await page.evaluate(() => JSON.parse(localStorage.getItem('static-threads-outfit-chat-demo-v1')));
    assert.equal(actionData.saved.length, 1); assert.equal(actionData.worn.length, 1);
    assert.ok(!JSON.stringify(actionData).includes('Dinner'), 'Chat prompt leaked into saved storage');
    await dialog.getByRole('button', { name: 'Another option', exact: true }).click();
    await page.waitForFunction(old => JSON.stringify([...document.querySelector('.outfit-chat-outfit').querySelectorAll('li strong')].map(node => node.textContent)) !== JSON.stringify(old), firstNames);
    for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(size);
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= size.width && bounds.y + bounds.height <= size.height, `Dialog overflows ${JSON.stringify(size)}`);
      const form = await dialog.getByRole('button', { name: 'Send', exact: true }).boundingBox();
      assert.ok(form.y >= bounds.y && form.y + form.height <= bounds.y + bounds.height, `Composer clipped: ${JSON.stringify({ size, bounds, form })}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (size.width === 390) await page.screenshot({ path: `${shots}/planner-mobile.png` });
      if (size.width === 1280) await page.screenshot({ path: `${shots}/planner-desktop.png` });
    }
    // Native modal traps focus and Escape returns it to the launcher.
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))); }
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await launcher.evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator('body').evaluate(node => node.style.overflow), '');
    await launcher.click();
    await dialog.getByText('Demo wardrobe', { exact: true }).waitFor();
    assert.equal(await dialog.getByRole('article').count(), 0, 'Conversation should not persist on close');
    await dialog.getByRole('button', { name: 'Saved demo outfits (1)' }).click();
    await dialog.locator('.outfit-chat-saved li').waitFor();
    await dialog.getByRole('button', { name: 'Close outfit planner' }).click();
    await page.goto(base + 'account/');
    await launcher.click(); await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Close outfit planner' }).click();
    if (process.env.TEST_PRIVATE === '1') {
      let dataMode = 'normal', failWrite = false;
      const writes = [];
      await context.route('https://auth-test.example/**', async route => {
        const request = route.request(), url = new URL(request.url());
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '' });
        let status = 200, body = {};
        if (url.pathname.endsWith('/user')) body = user;
        else if (url.pathname.endsWith('/wardrobe_items')) {
          assert.equal(url.searchParams.get('user_id'), `eq.${uid}`, 'User-scoped filter missing');
          if (dataMode === 'error') { status = 403; body = { message: 'not permitted' }; }
          else if (dataMode === 'empty') body = [];
          else if (dataMode === 'wrong-owner') body = privateItems.map(item => ({ ...item, user_id: 'other-user' }));
          else body = privateItems;
        } else if (url.pathname.endsWith('/outfit_events')) {
          assert.equal(request.method(), 'POST');
          writes.push(request.postDataJSON());
          status = failWrite ? 403 : 201;
          body = failWrite ? { message: 'not permitted' } : {};
        } else if (url.pathname.endsWith('/logout')) { status = 204; body = null; }
        else throw new Error(`Unexpected test request ${url.pathname}`);
        return route.fulfill({ status, headers, body: body === null ? '' : JSON.stringify(body) });
      });
      await page.evaluate(value => localStorage.setItem('sb-auth-test-auth-token', JSON.stringify(value)), testSession());
      await page.reload();
      await page.getByText('Signed in as', { exact: false }).waitFor();
      await launcher.click();
      await dialog.getByText('Your private wardrobe', { exact: true }).waitFor();
      await dialog.getByText('2 available pieces', { exact: true }).waitFor();
      await send('Dinner casual indoors');
      await dialog.getByRole('heading', { name: 'Option 1', exact: true }).waitFor();
      assert.deepEqual(await dialog.locator('.outfit-chat-outfit li strong').allTextContents(), ['Private dresses', 'Private shoes']);
      failWrite = true;
      await dialog.getByRole('button', { name: 'Save outfit', exact: true }).click();
      await dialog.getByRole('status').filter({ hasText: "This action couldn't be confirmed" }).waitFor();
      assert.equal(await dialog.getByRole('button', { name: 'Saved', exact: true }).count(), 0);
      failWrite = false;
      await dialog.getByRole('button', { name: 'Save outfit', exact: true }).click();
      await dialog.getByRole('status').filter({ hasText: 'Outfit saved to your account.' }).waitFor();
      const last = writes.at(-1);
      assert.equal(last.user_id, uid); assert.equal(last.action, 'saved');
      assert.deepEqual(last.item_ids.sort(), privateItems.map(item => item.id).sort());
      await dialog.getByRole('button', { name: 'Wore this', exact: true }).click();
      await dialog.getByRole('status').filter({ hasText: 'Wear event recorded in your account.' }).waitFor();
      assert.equal(writes.at(-1).action, 'worn');
      // Source switches cannot retain private suggestions in demo mode.
      await dialog.getByRole('button', { name: 'Try demo wardrobe' }).click();
      await dialog.getByText('Demo wardrobe', { exact: true }).waitFor();
      assert.equal(await dialog.getByText('Private dresses', { exact: true }).count(), 0);
      for (const mode of ['empty', 'error', 'wrong-owner']) {
        dataMode = mode;
        await dialog.getByRole('button', { name: 'Use my wardrobe' }).click();
        if (mode === 'empty') await dialog.getByText(/Your wardrobe is empty/).waitFor();
        else await dialog.getByRole('alert').filter({ hasText: 'Your private wardrobe could not be loaded' }).waitFor();
        assert.equal(await dialog.getByRole('article').count(), 0);
        assert.equal(await dialog.getByLabel('Tell the planner').isDisabled(), true);
        await dialog.getByRole('button', { name: 'Try demo wardrobe' }).click();
      }
      await dialog.getByRole('button', { name: 'Close outfit planner' }).click();
      await page.getByRole('button', { name: 'Sign out of this browser' }).click();
      await page.getByLabel('Email', { exact: true }).waitFor();
      await launcher.click();
      await dialog.getByText('Demo wardrobe', { exact: true }).waitFor();
      assert.equal(await dialog.getByText('Private dresses', { exact: true }).count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: event follow-ups, metadata gaps, grounded alternatives, demo save/wear persistence, modal focus/Escape, mobile dock clearance, responsive portrait/landscape and Account entry.' + (process.env.TEST_PRIVATE ? ' Private API scope, ownership, empty/error states and save/wear contracts passed.' : ''));
  } finally { await context.close(); await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
