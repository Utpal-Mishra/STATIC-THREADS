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
    await dock.waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).isVisible(), false);
    assert.equal(await page.locator('.mobile-account-link').count(), 0);
    assert.equal(await page.locator('dialog').count(), 0);
    assert.deepEqual(await dock.getByRole('link').allTextContents(), ['Style', 'Decide', 'Wardrobe', 'Similar', 'Radar', 'Account']);
    assert.equal(await dock.getByRole('button').count(), 0);
    for (const width of [320, 360, 390, 430, 680]) {
      await page.setViewportSize({ width, height: 844 });
      const box = await dock.boundingBox();
      assert.ok(box.x >= 6 && box.x + box.width <= width - 6, `Dock overflows ${width}px`);
      for (const target of await dock.getByRole('link').all()) {
        const hit = await target.boundingBox();
        assert.ok(hit.width >= 44 && hit.height >= 44, `Tap target too small at ${width}px: ${JSON.stringify(hit)}`);
        assert.equal(await target.locator('span').evaluate(e => e.scrollWidth <= e.clientWidth), true, `Label clipped at ${width}px`);
      }
      if (width === 320) await page.screenshot({ path: `${screenshots}/mobile-dock-320.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('link', { name: 'Static Threads home' }).click();
    await until(() => page.locator('#top').evaluate(e => e.getBoundingClientRect().top >= 85), 'Home anchor obscured by header');
    await page.screenshot({ path: `${screenshots}/mobile-dock.png` });
    for (const [label, id] of [['Style', 'style-studio'], ['Decide', 'decision-lab'], ['Wardrobe', 'wardrobe'], ['Similar', 'shop-similar'], ['Radar', 'sale-radar']]) {
      await dock.getByRole('link', { name: label, exact: true }).click();
      await until(() => dock.getByRole('link', { name: label, exact: true }).getAttribute('aria-current').then(x => x === 'location'), `${label} active state incorrect`);
      await until(() => page.locator(`#${id}`).evaluate(e => Math.abs(e.getBoundingClientRect().top - 92) < 20), `${label} anchor obscured`);
      assert.equal(await page.locator('body').evaluate(e => e.style.overflow === 'hidden'), false);
    }
    // Scroll without using a dock link to check the live section indicator.
    await page.locator('#decision-lab').evaluate(e => e.scrollIntoView({ block: 'start' }));
    await until(() => dock.getByRole('link', { name: 'Decide', exact: true }).getAttribute('aria-current').then(x => x === 'location'), 'Scroll-based active state failed');
    await dock.getByRole('link', { name: 'Account', exact: true }).click();
    await page.waitForURL(/\/account\/$/);
    await until(() => dock.getByRole('link', { name: 'Account', exact: true }).getAttribute('aria-current').then(x => x === 'page'), 'Account not highlighted');
    await page.getByRole('heading', { name: 'Your wardrobe should belong to you.', exact: true }).waitFor();
    assert.equal(await dock.getByRole('link').count(), 6);
    await page.screenshot({ path: `${screenshots}/mobile-account.png` });
    await dock.getByRole('link', { name: 'Wardrobe', exact: true }).click();
    await page.waitForURL(/#wardrobe$/);
    await until(() => dock.getByRole('link', { name: 'Wardrobe', exact: true }).getAttribute('aria-current').then(x => x === 'location'), 'Return from Account failed');
    await page.getByRole('link', { name: 'Static Threads home' }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    assert.equal(await dock.isVisible(), false);
    const desktop = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
    await desktop.waitFor({ state: 'visible' });
    assert.deepEqual(await desktop.getByRole('link').allTextContents(), ['Style', 'Decide', 'Wardrobe', 'Shop similar', 'Sale radar', 'Account']);
    await page.screenshot({ path: `${screenshots}/desktop-header.png` });
    await page.setViewportSize({ width: 681, height: 900 });
    assert.equal(await dock.isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('PASS: six direct links at 320/360/390/430/680px, 44px tap targets, unclipped labels, all five anchors, scroll-based active state, Account navigation/return and desktop 681/1280px. No app errors.');
  } catch (error) {
    if (page) {
      console.error('Failure state:', await page.evaluate(() => ({ width: innerWidth, css: Array.from(document.styleSheets).map(s => s.href), scroll: scrollY })));
      await page.screenshot({ path: `${screenshots}/failure.png` });
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
