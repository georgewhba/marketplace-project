import { test, expect } from '@playwright/test';

test.describe('Purchase Journey', () => {
  test('Complete flow: Register -> Add to Cart -> Checkout -> Orders', async ({ page }) => {
    const timestamp = Date.now();
    const email = `buyer-${timestamp}@example.com`;

    // 1. Register a new user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Sometimes there are multiple labels with similar names, getting the direct label
    await page.locator('input', { has: page.locator('xpath=preceding-sibling::label[text()="الاسم الأول"]') }).fill('أحمد');
    // For simplicity, let's just find by label text if it works, or fallback to CSS.
    // The previous page.getByRole('textbox', { name: 'الاسم الأول' }) might fail if label is not explicitly for (no htmlFor attribute).
    // Let's use getByLabel.
    
    // In RegisterPage.tsx, we have: <label className="form-label">الاسم الأول</label> <input className="form-input" ... />
    // They are siblings, not parent/child and no htmlFor. So getByRole/getByLabel might not link them.
    // Let's rely on standard sibling selector or placeholder if it's there. 
    // Wait, the easiest is to just use input[type="email"] and input[type="password"] etc.
    // We have:
    // 0: FirstName
    // 1: LastName
    // 2: Email (type="email")
    // 3: Password (type="password")
    // 4: Phone (type="tel")

    const inputs = page.locator('.form-input');
    await inputs.nth(0).fill('أحمد');
    await inputs.nth(1).fill('محمد');
    await inputs.nth(2).fill(email);
    await inputs.nth(3).fill('Aa123456');
    await inputs.nth(4).fill('01012345678');

    await page.getByRole('button', { name: 'إنشاء حساب' }).click();

    // Should redirect to homepage and show success message
    await expect(page.getByText('تم إنشاء الحساب بنجاح')).toBeVisible();

    // 2. Browse products
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Click "أضف للسلة" on the first product. We can get the first button that says "أضف للسلة".
    const addToCartBtn = page.getByRole('button', { name: 'أضف للسلة' }).first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();
    
    // Toast appears
    await expect(page.getByText('تمت الإضافة للسلة')).toBeVisible();

    // 3. Go to Cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Make sure we have "إتمام الشراء"
    await expect(page.getByRole('heading', { name: /سلة التسوق/ })).toBeVisible();
    await page.getByRole('button', { name: 'إتمام الشراء' }).click();

    // 4. Checkout
    await page.waitForURL('**/checkout');
    await page.waitForLoadState('networkidle');

    // Add address
    await page.getByRole('button', { name: /إضافة عنوان/ }).first().click();
    
    // Form for address:
    // index 0: fullName
    // index 1: phone
    // index 2: addressLine1
    // index 3: city
    const addressInputs = page.locator('form .form-input');
    await addressInputs.nth(0).fill('أحمد محمد');
    await addressInputs.nth(1).fill('01012345678');
    await addressInputs.nth(2).fill('شارع النيل');
    await addressInputs.nth(3).fill('القاهرة');
    
    await page.getByRole('button', { name: 'حفظ العنوان' }).click();
    await expect(page.getByText('تم إضافة العنوان')).toBeVisible();

    // Choose COD (should be selected by default, but let's click it just in case or skip)
    // Confirm order
    await page.getByRole('button', { name: 'تأكيد الطلب' }).click();

    // 5. Verify success and redirect to Orders
    await expect(page.getByText('تم تأكيد الطلب بنجاح')).toBeVisible();
    await page.waitForURL('**/orders');

    // Verify order is in the list
    await expect(page.getByRole('heading', { name: 'طلباتي' })).toBeVisible();
    await expect(page.getByText(/طلب #/).first()).toBeVisible();
  });
});
