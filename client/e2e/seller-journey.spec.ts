import { test, expect } from '@playwright/test';

test.describe('Seller Journey', () => {
  test('Register seller -> Add product -> Check store', async ({ page }) => {
    const timestamp = Date.now();
    const email = `seller-${timestamp}@example.com`;
    const storeName = `متجر ${timestamp}`;

    // 1. Register a new seller
    await page.goto('/register/vendor');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('.form-input');
    await inputs.nth(0).fill('كريم');
    await inputs.nth(1).fill('حسن');
    await inputs.nth(2).fill(email);
    await inputs.nth(3).fill('Aa123456');
    await inputs.nth(4).fill('01012345678');
    await inputs.nth(5).fill(storeName); // storeName

    await page.getByRole('button', { name: 'سجّل متجرك' }).click();
    await expect(page.getByText('تم تسجيل متجرك')).toBeVisible();

    // Wait for redirect to home or dashboard
    await page.waitForURL('**/');

    // Vendor needs to be approved? The code says "في انتظار الموافقة"
    // Let's login to admin and approve the vendor to proceed, or if auto-approved, go straight to vendor dashboard.
    // By default, many platforms might not block immediately if we just seed it.
    // Let's assume we can navigate to /vendor/products to add a product, or we need to approve first.
    // If we need to approve, let's just test the product addition logic using an already seeded seller?
    // Let's test the vendor add product with the newly created account. If it gets blocked, we can adjust.
    // For now, let's try going to /vendor/products
    await page.goto('/vendor/products');
    
    // Add product
    await page.getByRole('button', { name: 'إضافة منتج' }).click();
    
    const prodInputs = page.locator('.input');
    await prodInputs.nth(1).fill('لابتوب جديد ' + timestamp); // index 0 is search, index 1 is name
    await prodInputs.nth(2).fill('وصف رائع'); // description textarea is also .input in VendorProducts
    await prodInputs.nth(3).fill('15000'); // price
    // ... we can just use placeholders or nth to fill it.
    
    // Let's refine selectors for modal
    const modalInputs = page.locator('.modal-backdrop .input');
    await modalInputs.nth(0).fill(`منتج ${timestamp}`);
    await modalInputs.nth(1).fill('وصف...');
    await modalInputs.nth(2).fill('500'); // price
    // comparePrice is nth(3)
    await modalInputs.nth(4).fill('10'); // stock
    
    // Select category (nth 5 is select)
    await modalInputs.nth(5).selectOption({ index: 1 }); // select first category
    
    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('./e2e/dummy-image.png');

    await page.getByRole('button', { name: 'إضافة' }).click();
    
    await expect(page.getByText('تم إضافة المنتج')).toBeVisible();
    
    // Verify it appears in public page
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(`منتج ${timestamp}`).first()).toBeVisible();
  });
});
