import re

with open('server/routes/admin.routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace("import { authorize } from '../middleware/authorize.js';", "import { requirePermission } from '../middleware/rbac.js';")

# 2. Update global use
content = content.replace("adminRoutes.use('*', authenticate, authorize('admin'));", "adminRoutes.use('*', authenticate);")

# 3. Inject requirePermission into each route based on path and method
replacements = [
    (r"adminRoutes\.get\('/analytics/overview',\s*async\s*\(c\)\s*=>\s*\{", r"adminRoutes.get('/analytics/overview', requirePermission('analytics.view'), async (c) => {"),
    (r"adminRoutes\.get\('/analytics/top-products',\s*async\s*\(c\)\s*=>\s*\{", r"adminRoutes.get('/analytics/top-products', requirePermission('analytics.view'), async (c) => {"),
    (r"adminRoutes\.get\('/analytics/top-vendors',\s*async\s*\(c\)\s*=>\s*\{", r"adminRoutes.get('/analytics/top-vendors', requirePermission('analytics.view'), async (c) => {"),
    (r"adminRoutes\.get\('/analytics/funnel',\s*async\s*\(c\)\s*=>\s*\{", r"adminRoutes.get('/analytics/funnel', requirePermission('analytics.view'), async (c) => {"),
    (r"adminRoutes\.get\('/analytics/categories',\s*async\s*\(c\)\s*=>\s*\{", r"adminRoutes.get('/analytics/categories', requirePermission('analytics.view'), async (c) => {"),

    (r"adminRoutes\.get\('/dashboard',\s*async\s*\(c\)\s*=>\s*\{", r"adminRoutes.get('/dashboard', requirePermission('dashboard.view'), async (c) => {"),
    
    (r"adminRoutes\.get\('/vendors',\s*validate", r"adminRoutes.get('/vendors', requirePermission('vendors.approve'), validate"),
    (r"adminRoutes\.get\('/vendors/:id',\s*async", r"adminRoutes.get('/vendors/:id', requirePermission('vendors.approve'), async"),
    (r"adminRoutes\.put\('/vendors/:id/approve',\s*validate", r"adminRoutes.put('/vendors/:id/approve', requirePermission('vendors.approve'), validate"),
    (r"adminRoutes\.put\('/vendors/:id/reject',\s*validate", r"adminRoutes.put('/vendors/:id/reject', requirePermission('vendors.approve'), validate"),
    (r"adminRoutes\.put\('/vendors/:id/suspend',\s*async", r"adminRoutes.put('/vendors/:id/suspend', requirePermission('vendors.suspend'), async"),

    (r"adminRoutes\.get\('/products',\s*validate", r"adminRoutes.get('/products', requirePermission('products.moderate'), validate"),
    (r"adminRoutes\.put\('/products/:id/feature',\s*async", r"adminRoutes.put('/products/:id/feature', requirePermission('products.moderate'), async"),
    (r"adminRoutes\.put\('/products/:id/toggle',\s*async", r"adminRoutes.put('/products/:id/toggle', requirePermission('products.moderate'), async"),
    (r"adminRoutes\.delete\('/products/:id',\s*async", r"adminRoutes.delete('/products/:id', requirePermission('products.moderate'), async"),

    (r"adminRoutes\.get\('/categories',\s*async", r"adminRoutes.get('/categories', requirePermission('categories.manage'), async"),
    (r"adminRoutes\.post\('/categories',\s*validate", r"adminRoutes.post('/categories', requirePermission('categories.manage'), validate"),
    (r"adminRoutes\.put\('/categories/:id',\s*validate", r"adminRoutes.put('/categories/:id', requirePermission('categories.manage'), validate"),
    (r"adminRoutes\.delete\('/categories/:id',\s*async", r"adminRoutes.delete('/categories/:id', requirePermission('categories.manage'), async"),

    (r"adminRoutes\.get\('/orders',\s*validate", r"adminRoutes.get('/orders', requirePermission('orders.view'), validate"),

    (r"adminRoutes\.get\('/users',\s*validate", r"adminRoutes.get('/users', requirePermission('users.manage'), validate"),
    (r"adminRoutes\.put\('/users/:id/toggle',\s*async", r"adminRoutes.put('/users/:id/toggle', requirePermission('users.manage'), async"),

    (r"adminRoutes\.get\('/transactions',\s*validate", r"adminRoutes.get('/transactions', requirePermission('orders.view'), validate"),
    
    (r"adminRoutes\.get\('/settings',\s*async", r"adminRoutes.get('/settings', requirePermission('settings.edit'), async"),
    (r"adminRoutes\.put\('/settings',\s*validate", r"adminRoutes.put('/settings', requirePermission('settings.edit'), validate"),

    (r"adminRoutes\.get\('/coupons',\s*async", r"adminRoutes.get('/coupons', requirePermission('coupons.manage'), async"),
    (r"adminRoutes\.post\('/coupons',\s*validate", r"adminRoutes.post('/coupons', requirePermission('coupons.manage'), validate"),
    (r"adminRoutes\.delete\('/coupons/:id',\s*async", r"adminRoutes.delete('/coupons/:id', requirePermission('coupons.manage'), async"),

    (r"adminRoutes\.get\('/commission-rules',\s*async", r"adminRoutes.get('/commission-rules', requirePermission('commission.manage'), async"),
    (r"adminRoutes\.post\('/commission-rules',\s*validate", r"adminRoutes.post('/commission-rules', requirePermission('commission.manage'), validate"),
    (r"adminRoutes\.delete\('/commission-rules/:id',\s*async", r"adminRoutes.delete('/commission-rules/:id', requirePermission('commission.manage'), async"),

    (r"adminRoutes\.get\('/settlements',\s*async", r"adminRoutes.get('/settlements', requirePermission('payouts.approve'), async"),
    (r"adminRoutes\.put\('/settlements/:id/finalize',\s*async", r"adminRoutes.put('/settlements/:id/finalize', requirePermission('payouts.approve'), async"),

    (r"adminRoutes\.get\('/payouts',\s*async", r"adminRoutes.get('/payouts', requirePermission('payouts.approve'), async"),
    (r"adminRoutes\.put\('/payouts/:id/approve',\s*async", r"adminRoutes.put('/payouts/:id/approve', requirePermission('payouts.approve'), async"),
    (r"adminRoutes\.put\('/payouts/:id/reject',\s*validate", r"adminRoutes.put('/payouts/:id/reject', requirePermission('payouts.approve'), validate"),

    (r"adminRoutes\.get\('/message-logs',\s*async", r"adminRoutes.get('/message-logs', requirePermission('audit.view'), async"),
]

for pat, rep in replacements:
    content = re.sub(pat, rep, content)

with open('server/routes/admin.routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done patching admin.routes.ts")
