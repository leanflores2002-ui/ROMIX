const fs = require('fs');
const { test, expect } = require('@playwright/test');

const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const routes = [
  '/',
  '/catalogo.html',
  '/mujer.html',
  '/hombre.html',
  '/ninos.html',
  '/novedades.html',
];

for (const route of routes) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response && response.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/ROMIX/i);
    await expect(page.locator('[data-romix-shell="header-v1"]')).toBeVisible();
    await expect(page.locator('.brand').first()).toContainText('ROMIX');

    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(overflow.width).toBeLessThanOrEqual(overflow.viewport + 2);
  });
}

test('home exposes the primary shopping paths and core sections', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('a[href="mujer.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="hombre.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="ninos.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="novedades.html"]').first()).toBeVisible();
  await expect(page.locator('.main-hero-carousel')).toBeVisible();
  await expect(page.locator('#categoryTrack')).toBeVisible();
  await expect(page.locator('#productsRow')).toBeVisible();
});

for (const route of ['/', '/catalogo.html']) {
  test(`${route} has no serious or critical WCAG violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ content: axeSource });

    const results = await page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      });
    });

    const blocking = results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact)
    );

    expect(
      blocking,
      blocking.map((item) => `${item.id}: ${item.help}`).join('\n')
    ).toEqual([]);
  });
}
