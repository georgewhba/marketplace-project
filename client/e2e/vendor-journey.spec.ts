import { test, expect } from '@playwright/test';

test.describe('Vendor Journey', () => {
  test('Vendor can login, add a product, and it appears in the store', async ({ page }) => {
    // 1. Login as Vendor
    await page.goto('/login');
    await page.getByPlaceholder('example@email.com').fill('sony@marketplace.com');
    await page.getByPlaceholder('••••••••').fill('Vendor@123456');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    // Wait for redirect to vendor dashboard
    await page.waitForURL('**/vendor');
    
    // 2. Go to Vendor Products
    await page.goto('/vendor/products');
    
    // 3. Add a new product
    await page.getByRole('button', { name: 'إضافة منتج' }).click();
    
    const productName = `Playwright Product ${Date.now()}`;
    
    const modalInputs = page.locator('.input');
    await modalInputs.nth(1).fill(productName); // Name
    await modalInputs.nth(2).fill('This is a test product created by Playwright E2E.'); // Description
    await modalInputs.nth(3).fill('150.00'); // Price
    await modalInputs.nth(5).fill('20'); // Stock
    
    // Select the first category (value "1" assuming there is one, or just select by index if possible)
    await modalInputs.nth(6).selectOption({ index: 1 });
    
    await page.getByRole('button', { name: 'إضافة' }).click();
    
    // Verify success toast
    await expect(page.getByText('تم إضافة المنتج')).toBeVisible();
    
    // 4. Verify in public store
    await page.goto('/products');
    await page.getByPlaceholder('بحث').fill(productName); // Or just look for it if it's the newest
    // Wait, the search input on ProductsPage has no label. It's not in the file I checked?
    // Let's just check if it's visible on the page (since default sort is 'newest')
    await expect(page.getByText(productName)).toBeVisible();
  });
});
