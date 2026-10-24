import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './auth';
import { ToastProvider } from './toast';
import { LanguageProvider } from './i18n';
import { Header, Footer } from './components/Layout';
import { PageWrapper } from './components/PageWrapper';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { adminApi } from './api';

// Lazy page imports
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ServerErrorPage = lazy(() => import('./pages/ServerErrorPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ReturnPolicyPage = lazy(() => import('./pages/ReturnPolicyPage'));
const ShippingPolicyPage = lazy(() => import('./pages/ShippingPolicyPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const MotionPreviewPage = lazy(() => import('./pages/MotionPreviewPage'));
const MockPaymobPage = lazy(() => import('./pages/MockPaymobPage'));
// Vendor pages
const VendorProducts = lazy(() => import('./pages/vendor/VendorProducts'));
const VendorOrders = lazy(() => import('./pages/vendor/VendorOrders'));
const VendorEarnings = lazy(() => import('./pages/vendor/VendorEarnings'));
const VendorSubscriptions = lazy(() => import('./pages/vendor/VendorSubscriptions'));
const VendorSettings = lazy(() => import('./pages/vendor/VendorSettings'));
const VendorAnalytics = lazy(() => import('./pages/vendor/VendorAnalytics'));

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
const AdminRoles = lazy(() => import('./pages/admin/AdminRoles'));
const AdminMessageLogs = lazy(() => import('./pages/admin/AdminMessageLogs'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminPromotions = lazy(() => import('./pages/admin/AdminPromotions'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAISettings = lazy(() => import('./pages/admin/AdminAISettings').then(m => ({ default: m.AdminAISettings })));

// Layouts (eager — small shell components)
import VendorDashboard, { VendorLayout } from './pages/vendor/VendorDashboard';
import AdminDashboard, { AdminLayout } from './pages/admin/AdminDashboard';
import { AIChatWidget } from './components/chat/AIChatWidget';

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

function ProtectedRoute({ children, roles, permission }: { children: ReactNode; roles?: string[]; permission?: string }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (permission && !user.isSuperAdmin && !(user.permissions || []).includes(permission)) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return <PageWrapper>{children}</PageWrapper>;
}

function VendorStoreRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/products?vendor=${encodeURIComponent(slug || '')}`} replace />;
}

function AdminTransactionsView() {
  const [page, setPage] = useState(1);
  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-transactions', page],
    queryFn: () => adminApi.getTransactions(page),
  });

  const transactions = res?.data || [];
  const meta = (res as any)?.meta;

  return (
    <div>
      <h1 className="page-header__title mb-6">المعاملات المالية</h1>
      {isLoading ? (
        <Loading />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المتجر</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>الرصيد قبل</th>
                <th>الرصيد بعد</th>
                <th>الوصف</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-4">لا توجد معاملات مالية</td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{tx.vendorName}</td>
                    <td>
                      <span className={`badge ${tx.type === 'commission' ? 'badge-success' : tx.type === 'payout' ? 'badge-info' : 'badge-warning'}`}>
                        {tx.type === 'commission' ? 'عمولة مبيعات' : tx.type === 'payout' ? 'سحب أرباح' : tx.type === 'refund' ? 'استرجاع' : tx.type}
                      </span>
                    </td>
                    <td>{Number(tx.amount).toLocaleString('ar-EG')} ج.م</td>
                    <td>{Number(tx.balanceBefore).toLocaleString('ar-EG')} ج.م</td>
                    <td>{Number(tx.balanceAfter).toLocaleString('ar-EG')} ج.م</td>
                    <td>{tx.description || '-'}</td>
                    <td>{new Date(tx.createdAt).toLocaleDateString('ar-EG')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              {Array.from({ length: meta.totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <PageWrapper>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </PageWrapper>
      <AIChatWidget />
      <Footer />
    </>
  );
}

function DashboardWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <Header className="hidden md:block" />
      <PageWrapper>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </PageWrapper>
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth pages — no header/footer */}
        <Route path="/login" element={<GuestRoute><Suspense fallback={<Loading />}><LoginPage /></Suspense></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Suspense fallback={<Loading />}><RegisterPage /></Suspense></GuestRoute>} />
        <Route path="/register/vendor" element={<GuestRoute><Suspense fallback={<Loading />}><RegisterPage /></Suspense></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><Suspense fallback={<Loading />}><ForgotPasswordPage /></Suspense></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><Suspense fallback={<Loading />}><ResetPasswordPage /></Suspense></GuestRoute>} />

        {/* Store pages */}
        <Route path="/" element={<StoreLayout><HomePage /></StoreLayout>} />
        <Route path="/products" element={<StoreLayout><ProductsPage /></StoreLayout>} />
        <Route path="/products/:slug" element={<StoreLayout><ProductDetailPage /></StoreLayout>} />
        <Route path="/store/:slug" element={<VendorStoreRedirect />} />
        <Route path="/cart" element={<StoreLayout><ProtectedRoute><CartPage /></ProtectedRoute></StoreLayout>} />
        <Route path="/checkout" element={<StoreLayout><ProtectedRoute><CheckoutPage /></ProtectedRoute></StoreLayout>} />
        <Route path="/payment-callback" element={<StoreLayout><ProtectedRoute><PaymentCallbackPage /></ProtectedRoute></StoreLayout>} />
        <Route path="/orders" element={<StoreLayout><ProtectedRoute><OrdersPage /></ProtectedRoute></StoreLayout>} />
        <Route path="/wishlist" element={<StoreLayout><ProtectedRoute><WishlistPage /></ProtectedRoute></StoreLayout>} />
        <Route path="/profile" element={<StoreLayout><ProtectedRoute><ProfilePage /></ProtectedRoute></StoreLayout>} />
        <Route path="/notifications" element={<StoreLayout><ProtectedRoute><NotificationsPage /></ProtectedRoute></StoreLayout>} />
        <Route path="/terms" element={<StoreLayout><Suspense fallback={<Loading />}><TermsPage /></Suspense></StoreLayout>} />
        <Route path="/privacy" element={<StoreLayout><Suspense fallback={<Loading />}><PrivacyPage /></Suspense></StoreLayout>} />
        <Route path="/return-policy" element={<StoreLayout><Suspense fallback={<Loading />}><ReturnPolicyPage /></Suspense></StoreLayout>} />
        <Route path="/shipping-policy" element={<StoreLayout><Suspense fallback={<Loading />}><ShippingPolicyPage /></Suspense></StoreLayout>} />
        <Route path="/faq" element={<StoreLayout><Suspense fallback={<Loading />}><FaqPage /></Suspense></StoreLayout>} />
        <Route path="/contact" element={<StoreLayout><Suspense fallback={<Loading />}><ContactPage /></Suspense></StoreLayout>} />
        <Route path="/motion-preview" element={<StoreLayout><Suspense fallback={<Loading />}><MotionPreviewPage /></Suspense></StoreLayout>} />
        <Route path="/mock-paymob" element={<StoreLayout><Suspense fallback={<Loading />}><MockPaymobPage /></Suspense></StoreLayout>} />

        {/* Vendor dashboard */}
        <Route path="/vendor" element={<DashboardWrapper><ProtectedRoute roles={['vendor']}><VendorLayout /></ProtectedRoute></DashboardWrapper>}>
          <Route index element={<VendorDashboard />} />
          <Route path="products" element={<Suspense fallback={<Loading />}><VendorProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<Loading />}><VendorOrders /></Suspense>} />
          <Route path="earnings" element={<Suspense fallback={<Loading />}><VendorEarnings /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<Loading />}><VendorAnalytics /></Suspense>} />
          <Route path="subscriptions" element={<Suspense fallback={<Loading />}><VendorSubscriptions /></Suspense>} />
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
          <Route path="roles" element={<Suspense fallback={<Loading />}><AdminRoles /></Suspense>} />
          <Route path="message-logs" element={<Suspense fallback={<Loading />}><AdminMessageLogs /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<Loading />}><AdminAnalytics /></Suspense>} />
          <Route path="transactions" element={<AdminTransactionsView />} />
          <Route path="coupons" element={<Suspense fallback={<Loading />}><AdminCoupons /></Suspense>} />
          <Route path="promotions" element={<Suspense fallback={<Loading />}><AdminPromotions /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<Loading />}><AdminSettings /></Suspense>} />
          <Route path="ai-settings" element={<Suspense fallback={<Loading />}><AdminAISettings /></Suspense>} />
        </Route>

        {/* Fallbacks */}
        <Route path="/server-error" element={<Suspense fallback={<Loading />}><ServerErrorPage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<Loading />}><NotFoundPage /></Suspense>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <AnimatedRoutes />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
