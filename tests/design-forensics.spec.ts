import { test, chromium, expect } from '@playwright/test';

test.describe('Vercel Design Forensics', () => {
  test('capture Vercel design tokens and layouts', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://vercel.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Capture full page
    await page.screenshot({ path: 'playwright-screenshots/vercel-full.png', fullPage: true });

    // Analyze header/navigation
    const nav = page.locator('nav, header').first();
    if (await nav.isVisible()) {
      const navBox = await nav.boundingBox();
      console.log('Nav bounding box:', JSON.stringify(navBox));

      const navStyles = await nav.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          background: cs.backgroundColor,
          height: cs.height,
          display: cs.display,
          alignItems: cs.alignItems,
          justifyContent: cs.justifyContent,
          padding: cs.padding,
          borderBottom: cs.borderBottom,
        };
      });
      console.log('Nav styles:', JSON.stringify(navStyles, null, 2));
    }

    // Analyze hero section (first h1)
    const h1 = page.locator('h1').first();
    if (await h1.isVisible()) {
      const h1Styles = await h1.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          letterSpacing: cs.letterSpacing,
          lineHeight: cs.lineHeight,
          marginBottom: cs.marginBottom,
        };
      });
      console.log('H1 styles:', JSON.stringify(h1Styles, null, 2));
    }

    // Analyze buttons
    const button = page.locator('a:has-text("Sign Up"), button:has-text("Get Started")').first();
    if (await button.isVisible()) {
      const btnStyles = await button.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          background: cs.backgroundColor,
          color: cs.color,
          padding: cs.padding,
          borderRadius: cs.borderRadius,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily,
        };
      });
      console.log('Button styles:', JSON.stringify(btnStyles, null, 2));
    }

    // Analyze cards (if any)
    const card = page.locator('[class*="card"], section, article').first();
    if (await card.isVisible()) {
      const cardStyles = await card.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          background: cs.backgroundColor,
          padding: cs.padding,
          borderRadius: cs.borderRadius,
          boxShadow: cs.boxShadow,
          margin: cs.margin,
        };
      });
      console.log('Card styles:', JSON.stringify(cardStyles, null, 2));
    }

    // Body font
    const bodyFont = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    console.log('Body fontFamily:', bodyFont);

    // Check for Inter or Geist
    const hasInter = await page.evaluate(() => {
      return document.fonts.check('16px Inter') || document.fonts.check('16px Geist');
    });
    console.log('Has design font?', hasInter);
  }, 120000);
});
