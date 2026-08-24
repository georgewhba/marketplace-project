import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = 'http://localhost:5173';

const pagesToTest = [
  { name: 'Home', path: '/' },
  { name: 'Cart', path: '/cart' },
  { name: 'Checkout', path: '/checkout' }, // May require auth, will test unauthenticated state or generic structure
  { name: 'Login', path: '/login' },
  { name: 'Vendor Dashboard', path: '/vendor' },
  { name: 'Admin Dashboard', path: '/admin' }
];

test.describe('Accessibility Checks (WCAG 2 AA)', () => {
  for (const pageInfo of pagesToTest) {
    test(`Should not have any automatically detectable accessibility issues on ${pageInfo.name}`, async ({ page }) => {
      await page.goto(`${BASE_URL}${pageInfo.path}`);
      
      // Wait for a generic network idle or specific element if needed, but a short timeout helps
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
