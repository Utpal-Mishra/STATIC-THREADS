// Browser regression checks for the mobile-only dock. CI supplies Playwright;
// it is a QA dependency, not part of the application bundle.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../out');
const screenshots = '/tmp/mobile-dock-qa';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/STATIC-THREADS(?=\/|$)/, '') || '/';
  let file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

async function until(check, message) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(message);
}

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  await new Promise(resolve => server.listen(4174, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:4174/STATIC-THREADS/', { waitUntil: 'load' });
    assert.equal(await page.title(), 'Static Threads');
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.ok(!/Application error|Internal Server Error/.test(await page.locator('body').innerText()));
    const dock = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
    const menuButton = dock.getByRole('button', { name: 'Open navigation menu' });
    const menu = page.getByRole('dialog', { name: 'Explore Static Threads' });
    await dock.waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).isVisible(), false);
    for (const width of [320, 390, 680]) {
      await page.setViewportSize({ width, height: 844 });
      const box = await dock.boundingBox();
      assert.ok(box.x >= 10 && box.x + box.width <= width - 10, `Dock overflows ${width}px`);
      for (const target of await dock.locator('a, button').all()) {
        const hit = await target.boundingBox();
        assert.ok(hit.width >= 44 && hit.height >= 44);
      }
      await menuButton.click();
      await menu.waitFor({ state: 'visible' });
      const bounds = await menu.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `Menu overflows ${width}px`);
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height < 844);
      assert.equal(await menu.getByRole('link').count(), 6);
      assert.equal(await page.locator('body').evaluate(e => e.style.overflow), 'hidden');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await menu.evaluate(e => e.contains(document.activeElement)), true);
      await page.keyboard.press('Escape');
      await menu.waitFor({ state: 'hidden' });
      await until(() => menuButton.evaluate(e => document.activeElement === e), 'Focus not restored');
      await until(() => page.locator('body').evaluate(e => e.style.overflow !== 'hidden'), 'Scroll not restored');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('link', { name: 'Static Threads home' }).click();
    await page.screenshot({ path: `${screenshots}/mobile-dock.png` });
    for (const [label, id] of [['Wardrobe', 'wardrobe'], ['Decide', 'decision-lab'], ['Style', 'style-studio']]) {
      await dock.getByRole('link', { name: label, exact: true }).click();
      await until(() => dock.getByRole('link', { name: label, exact: true }).getAttribute('aria-current').then(x => x === 'location'), `${label} active state incorrect`);
      await until(() => page.locator(`#${id}`).evaluate(e => Math.abs(e.getBoundingClientRect().top - 92) < 20), `${label} anchor obscured`);
    }
    await menuButton.click();
    await menu.getByRole('link', { name: 'Sale radar', exact: true }).click();
    await menu.waitFor({ state: 'hidden' });
    await until(() => page.locator('#sale-radar').evaluate(e => Math.abs(e.getBoundingClientRect().top - 92) < 20), 'Sale anchor obscured');
    await until(() => menuButton.evaluate(e => e.classList.contains('is-active')), 'Menu section not highlighted');
    await menuButton.click();
    await menu.getByRole('link', { name: 'Shop similar', exact: true }).click();
    await menu.waitFor({ state: 'hidden' });
    await until(() => page.locator('#shop-similar').evaluate(e => Math.abs(e.getBoundingClientRect().top - 92) < 20), 'Shop anchor obscured');
    await menuButton.click();
    assert.ok((await menu.getByRole('link', { name: 'Account', exact: true }).getAttribute('href')).endsWith('/account/'));
    await page.mouse.click(2, 2);
    await menu.waitFor({ state: 'hidden' });
    await page.getByRole('link', { name: 'Static Threads home' }).click();
    await menuButton.click();
    await page.screenshot({ path: `${screenshots}/mobile-menu.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await menu.waitFor({ state: 'hidden' });
    assert.equal(await dock.isVisible(), false);
    assert.equal(await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link').count(), 6);
    await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).waitFor({ state: 'visible' });
    await page.screenshot({ path: `${screenshots}/desktop-header.png` });
    await page.setViewportSize({ width: 681, height: 900 });
    assert.equal(await dock.isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('PASS: 320/390/680px dock and menu bounds, tap targets, all destinations, active states, focus trap/restore, Escape/backdrop dismissal, scroll locking and desktop 681/1280px. No app errors.');
  } catch (error) {
    if (page) {
      console.error('Failure state:', await page.evaluate(() => ({ width: innerWidth, css: Array.from(document.styleSheets).map(s => s.href), scroll: scrollY })));
      await page.screenshot({ path: `${screenshots}/failure.png` });
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
