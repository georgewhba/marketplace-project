# Manual Testing Checklist

This checklist documents the manual testing procedures for ensuring broad compatibility and usability of the marketplace platform.

## 1. Browser & Device Compatibility
- [ ] **Google Chrome (Latest)** - Desktop
- [ ] **Mozilla Firefox (Latest)** - Desktop
- [ ] **Safari (Latest)** - macOS
- [ ] **Microsoft Edge** - Desktop
- [ ] **iOS Safari** - iPhone 13/14/15
- [ ] **Android Chrome** - Pixel / Galaxy S-series
- [ ] **iPadOS Safari** - iPad

## 2. RTL (Right-to-Left) Layout Support
- [ ] Toggle platform language to Arabic.
- [ ] Verify sidebar navigation aligns to the right.
- [ ] Verify tables (Orders, Products) have logical column ordering (Right to Left).
- [ ] Verify checkout form labels and inputs are aligned correctly.
- [ ] Ensure icons (like "next page" vs "previous page") are mirrored correctly.

## 3. Vendor & Admin User Flows (Manual Smoke Test)
- [ ] **Vendor:** Log in, navigate to Dashboard, add a new product with 3 images.
- [ ] **Vendor:** Check analytics dashboard to verify total sales render without crashing.
- [ ] **Admin:** Log in, navigate to Coupons page, create a 20% discount coupon.
- [ ] **Customer:** Log in, add the newly created vendor product to the cart.
- [ ] **Customer:** Apply the admin-created coupon in the checkout process.
- [ ] **Customer:** Complete checkout using the Staging Payment Gateway.
- [ ] **Vendor:** Verify order appears in Vendor dashboard and stock is deducted.

## 4. Edge Cases
- [ ] Apply coupon on an empty cart (Should show friendly error).
- [ ] Attempt to checkout with 0 stock (Should block checkout and remove from cart).
- [ ] Log out as admin and attempt to navigate to `/admin` via URL directly (Should redirect to login).
