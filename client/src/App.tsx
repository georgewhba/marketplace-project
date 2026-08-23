import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './auth';
import { ToastProvider } from './toast';
import { Header, Footer } from './components/Layout';
import { lazy, Suspense, type ReactNode } from 'react';

// Lazy page imports
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ServerErrorPage = lazy(() => import('./pages/ServerErrorPage'));

// Vendor pages
const VendorProducts = lazy(() => import('./pages/vendor/VendorProducts'));
const VendorOrders = lazy(() => import('./pages/vendor/VendorOrders'));
const VendorEarnings = lazy(() => import('./pages/vendor/VendorEarnings'));
const VendorSettings = lazy(() => import('./pages/vendor/VendorSettings'));

// Admin pages
const AdminVendors = lazy(() => import('./pages/admin/AdminVendors'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminRefunds = lazy(() => import('./pages/admin/AdminRefunds'));
const AdminCommissionRules = lazy(() => import('./pages/admin/AdminCommissionRules').then(m => ({ default: m.AdminCommissionRules })));
const AdminSettlements = lazy(() => import('./pages/admin/AdminSettlements').then(m => ({ default: m.AdminSettlements })));
const AdminPayouts = lazy(() => import('./pages/admin/AdminPayouts').then(m => ({ default: m.AdminPayouts })));

// Layouts (eager — small shell components)
import VendorDashboard, { VendorLayout } from './pages/vendor/VendorDashboard';
import AdminDashboard, { AdminLayout } from './pages/admin/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div className="skeleton" style={{ width: 200, height: 24 }} />
    </div>
  );
}

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={<Loading />}>{children}</Suspense>
      <Footer />
    </>
  );
}

function DashboardWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Auth pages — no header/footer */}
              <Route path="/login" element={<Suspense fallback={<Loading />}><LoginPage /></Suspense>} />
              <Route path="/register" element={<Suspense fallback={<Loading />}><RegisterPage /></Suspense>} />
              <Route path="/register/vendor" element={<Suspense fallback={<Loading />}><RegisterPage /></Suspense>} />

              {/* Store pages */}
              <Route path="/" element={<StoreLayout><HomePage /></StoreLayout>} />
              <Route path="/products" element={<StoreLayout><ProductsPage /></StoreLayout>} />
              <Route path="/products/:slug" element={<StoreLayout><ProductDetailPage /></StoreLayout>} />
              <Route path="/cart" element={<StoreLayout><ProtectedRoute><CartPage /></ProtectedRoute></StoreLayout>} />
              <Route path="/checkout" element={<StoreLayout><ProtectedRoute><CheckoutPage /></ProtectedRoute></StoreLayout>} />
              <Route path="/payment-callback" element={<StoreLayout><ProtectedRoute><PaymentCallbackPage /></ProtectedRoute></StoreLayout>} />
              <Route path="/orders" element={<StoreLayout><ProtectedRoute><OrdersPage /></ProtectedRoute></StoreLayout>} />
              <Route path="/wishlist" element={<StoreLayout><ProtectedRoute><WishlistPage /></ProtectedRoute></StoreLayout>} />
              <Route path="/profile" element={<StoreLayout><ProtectedRoute><ProfilePage /></ProtectedRoute></StoreLayout>} />

              {/* Vendor dashboard */}
              <Route path="/vendor" element={<DashboardWrapper><ProtectedRoute roles={['vendor']}><VendorLayout /></ProtectedRoute></DashboardWrapper>}>
                <Route index element={<VendorDashboard />} />
                <Route path="products" element={<Suspense fallback={<Loading />}><VendorProducts /></Suspense>} />
                <Route path="orders" element={<Suspense fallback={<Loading />}><VendorOrders /></Suspense>} />
                <Route path="earnings" element={<Suspense fallback={<Loading />}><VendorEarnings /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<Loading />}><VendorSettings /></Suspense>} />
              </Route>

              {/* Admin dashboard */}
              <Route path="/admin" element={<DashboardWrapper><ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute></DashboardWrapper>}>
                <Route index element={<AdminDashboard />} />
                <Route path="vendors" element={<Suspense fallback={<Loading />}><AdminVendors /></Suspense>} />
                <Route path="products" element={<Suspense fallback={<Loading />}><AdminProducts /></Suspense>} />
                <Route path="orders" element={<Suspense fallback={<Loading />}><AdminOrders /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<Loading />}><AdminUsers /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<Loading />}><AdminCategories /></Suspense>} />
                <Route path="refunds" element={<Suspense fallback={<Loading />}><AdminRefunds /></Suspense>} />
                <Route path="commission-rules" element={<Suspense fallback={<Loading />}><AdminCommissionRules /></Suspense>} />
                <Route path="settlements" element={<Suspense fallback={<Loading />}><AdminSettlements /></Suspense>} />
                <Route path="payouts" element={<Suspense fallback={<Loading />}><AdminPayouts /></Suspense>} />
                <Route path="transactions" element={<div style={{ padding: 'var(--space-6)' }}><h2>المعاملات — قريباً</h2></div>} />
                <Route path="coupons" element={<div style={{ padding: 'var(--space-6)' }}><h2>الكوبونات — قريباً</h2></div>} />
                <Route path="settings" element={<div style={{ padding: 'var(--space-6)' }}><h2>الإعدادات — قريباً</h2></div>} />
              </Route>

              {/* 500 */}
              <Route path="/500" element={<Suspense fallback={<Loading />}><ServerErrorPage /></Suspense>} />
              {/* 404 */}
              <Route path="*" element={<Suspense fallback={<Loading />}><NotFoundPage /></Suspense>} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
