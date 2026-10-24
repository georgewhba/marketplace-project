const BASE = '/api';

let refreshPromise: Promise<boolean> | null = null;

function getValidToken(key: string): string | null {
  const raw = localStorage.getItem(key);
  return raw && raw !== 'undefined' && raw !== 'null' ? raw : null;
}

function parseErrorMessage(err: any): string {
  const details = err?.error?.details;
  if (Array.isArray(details) && details.length > 0 && details[0]?.message) {
    return details[0].message;
  }
  if (typeof err?.error === 'string') {
    return err.error;
  }
  if (err?.error?.message) {
    return err.error.message;
  }
  if (typeof err?.message === 'string') {
    return err.message;
  }
  return 'حدث خطأ';
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getValidToken('refreshToken');
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      if (!refreshRes.ok) return false;

      const refreshJson = (await refreshRes.json().catch(() => ({}))) as any;
      const data = refreshJson?.data || refreshJson;
      if (typeof data?.accessToken === 'string' && data.accessToken !== 'undefined' && data.accessToken !== 'null') {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (typeof data?.refreshToken === 'string' && data.refreshToken !== 'undefined' && data.refreshToken !== 'null') {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const rawToken = localStorage.getItem('accessToken');
  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : null;
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getValidToken('accessToken');
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      } else {
        delete headers['Authorization'];
      }
      const retryRes = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        ...options,
        headers,
      });
      const retryJson = (await retryRes.json().catch(() => ({}))) as any;
      if (!retryRes.ok) {
        throw new ApiError(
          retryRes.status,
          parseErrorMessage(retryJson),
          retryJson?.error?.code,
          retryJson?.error?.details
        );
      }
      return retryJson as unknown as T;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth:logout'));
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    const msg = parseErrorMessage(err);
    throw new ApiError(res.status, msg, err?.error?.code, err?.error?.details);
  }

  const json = (await res.json()) as { data: T; pagination?: any };
  return json as unknown as T;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Generic helpers
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  put: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post<any>('/auth/login', data),
  register: (data: any) => api.post<any>('/auth/register', data),
  verifyOtp: (data: { email: string; otp: string }) => api.post<any>('/auth/verify-otp', data),
  googleAuth: (data: { idToken: string; vendorData?: any }) => api.post<any>('/auth/google', data),
  registerVendor: (data: any) => api.post<any>('/auth/register/vendor', data),
  refresh: (refreshToken?: string) => api.post<any>('/auth/refresh', refreshToken ? { refreshToken } : {}),
  logout: (refreshToken?: string) => api.post<any>('/auth/logout', refreshToken ? { refreshToken } : {}),
  forgotPassword: (email: string) => api.post<any>('/auth/forgot-password', { email }),
  resetPassword: (data: any) => api.post<any>('/auth/reset-password', data),
  getProfile: () => api.get<any>('/auth/me'),
  updateProfile: (data: any) => api.put<any>('/auth/me', data),
  changePassword: (data: any) => api.put<any>('/auth/me/password', data),
  setupMfa: () => api.post<any>('/auth/mfa/setup'),
  verifyMfa: (tokenOrTempToken: string, maybeCode?: string) => {
    const hasTwoArgs = maybeCode !== undefined;
    const code = hasTwoArgs ? maybeCode : tokenOrTempToken;
    const tempToken = hasTwoArgs ? tokenOrTempToken : undefined;
    const headers: Record<string, string> = {};
    if (tempToken && tempToken !== 'undefined' && tempToken !== 'null') {
      headers['Authorization'] = `Bearer ${tempToken}`;
    }
    return request<any>('/auth/mfa/verify', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ token: code }),
    });
  },
  challengeMfa: (tokenOrTempToken: string, maybeCode?: string) => {
    const hasTwoArgs = maybeCode !== undefined;
    const code = hasTwoArgs ? maybeCode : tokenOrTempToken;
    const tempToken = hasTwoArgs ? tokenOrTempToken : undefined;
    const headers: Record<string, string> = {};
    if (tempToken && tempToken !== 'undefined' && tempToken !== 'null') {
      headers['Authorization'] = `Bearer ${tempToken}`;
    }
    return request<any>('/auth/mfa/challenge', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ token: code }),
    });
  },
  disableMfa: (token: string) => api.post<any>('/auth/mfa/disable', { token }),
  getNotificationPreferences: () => api.get<any>('/auth/me/notification-preferences'),
  updateNotificationPreference: (data: any) => api.put<any>('/auth/me/notification-preferences', data),
};

// Store
export const storeApi = {
  getSettings: () => api.get<any>('/store/settings'),
  getHome: () => api.get<any>('/store/home'),
  getCategories: () => api.get<any>('/store/categories'),
  getCategory: (slug: string) => api.get<any>(`/store/categories/${slug}`),
  getProducts: (params?: any) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ) as Record<string, string>;
    const qs = new URLSearchParams(cleanParams).toString();
    return api.get<any>(`/store/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (slug: string) => api.get<any>(`/store/products/${slug}`),
  getVendorStore: (slug: string) => api.get<any>(`/store/vendors/${slug}`),
  sendContactMessage: (data: any) => api.post<any>('/store/contact', data),
};

// Cart
export const cartApi = {
  getCart: () => api.get<any>('/cart'),
  getCount: () => api.get<any>('/cart/count'),
  addItem: (productId: number, quantity: number) => api.post<any>('/cart', { productId, quantity }),
  updateItem: (id: number, quantity: number) => api.put<any>(`/cart/${id}`, { quantity }),
  removeItem: (id: number) => api.delete<any>(`/cart/${id}`),
  clearCart: () => api.delete<any>('/cart'),
};

// Orders
export const orderApi = {
  checkout: (data: { addressId: number; couponCode?: string; notes?: string }) =>
    api.post<any>('/orders', data),
  getOrders: (page = 1) => api.get<any>(`/orders?page=${page}`),
  getOrder: (id: number) => api.get<any>(`/orders/${id}`),
  getTracking: (id: number) => api.get<any>(`/orders/${id}/tracking`),
  cancelOrder: (id: number) => api.put<any>(`/orders/${id}/cancel`),
};

// Addresses
export const addressApi = {
  getAddresses: () => api.get<any>('/addresses'),
  createAddress: (data: any) => api.post<any>('/addresses', data),
  updateAddress: (id: number, data: any) => api.put<any>(`/addresses/${id}`, data),
  deleteAddress: (id: number) => api.delete<any>(`/addresses/${id}`),
  setDefault: (id: number) => api.put<any>(`/addresses/${id}/default`),
};

// Payments
export const paymentApi = {
  initiate: (data: { orderId: number; method: string }) => api.post<any>('/payments/initiate', data),
};

// Reviews
export const reviewApi = {
  getProductReviews: (productId: number, page = 1) =>
    api.get<any>(`/reviews/product/${productId}?page=${page}`),
  createReview: (data: any) => api.post<any>('/reviews', data),
};

// Wishlist
export const wishlistApi = {
  getWishlist: () => api.get<any>('/wishlist'),
  toggle: (productId: number) => api.post<any>('/wishlist', { productId }),
  check: (productId: number) => api.get<any>(`/wishlist/check/${productId}`),
  remove: (productId: number) => api.delete<any>(`/wishlist/${productId}`),
};

// Vendor
export const vendorApi = {
  getDashboard: () => api.get<any>('/vendor/dashboard'),
  getProducts: (page = 1) => api.get<any>(`/vendor/products?page=${page}`),
  createProduct: (data: any) => api.post<any>('/vendor/products', data),
  updateProduct: (id: number, data: any) => api.put<any>(`/vendor/products/${id}`, data),
  deleteProduct: (id: number) => api.delete<any>(`/vendor/products/${id}`),
  uploadProductImage: (productId: number, formData: FormData) =>
    api.post<any>(`/vendor/products/${productId}/images`, formData),
  deleteProductImage: (productId: number, imgId: number) =>
    api.delete<any>(`/vendor/products/${productId}/images/${imgId}`),
  getOrders: (page = 1) => api.get<any>(`/vendor/orders?page=${page}`),
  updateOrderStatus: (itemId: number, data: { status: string; trackingNumber?: string }) =>
    api.put<any>(`/vendor/orders/${itemId}/status`, data),
  createShipment: (itemId: number, data: { provider: 'bosta' | 'manual'; trackingNumber?: string }) =>
    api.post<any>(`/vendor/orders/${itemId}/ship`, data),
  getEarnings: (page = 1) => api.get<any>(`/vendor/earnings?page=${page}`),
  getSettlements: (page = 1) => api.get<any>(`/vendor/settlements?page=${page}`),
  getPayouts: () => api.get<any>(`/vendor/payouts`),
  requestPayout: (data: { settlementId: number; amount: string }) => api.post<any>(`/vendor/payouts/request`, data),
  getSettings: () => api.get<any>('/vendor/settings'),
  updateSettings: (data: any) => api.put<any>('/vendor/settings', data),
  getNotifications: () => api.get<any>('/vendor/notifications'),
  markNotificationRead: (id: number) => api.put<any>(`/vendor/notifications/${id}/read`),
};

// Admin
export const adminApi = {
  getDashboard: () => api.get<any>('/admin/dashboard'),
  getVendors: (page = 1, status?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    return api.get<any>(`/admin/vendors?${params}`);
  },
  getVendor: (id: number) => api.get<any>(`/admin/vendors/${id}`),
  approveVendor: (id: number, commissionRate?: string) =>
    api.put<any>(`/admin/vendors/${id}/approve`, { commissionRate }),
  rejectVendor: (id: number, reason: string) =>
    api.put<any>(`/admin/vendors/${id}/reject`, { reason }),
  suspendVendor: (id: number) => api.put<any>(`/admin/vendors/${id}/suspend`),
  getProducts: (page = 1, search?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    return api.get<any>(`/admin/products?${params}`);
  },
  featureProduct: (id: number) => api.put<any>(`/admin/products/${id}/feature`),
  toggleProduct: (id: number) => api.put<any>(`/admin/products/${id}/toggle`),
  deleteProduct: (id: number) => api.delete<any>(`/admin/products/${id}`),
  getCategories: () => api.get<any>('/admin/categories'),
  createCategory: (data: any) => api.post<any>('/admin/categories', data),
  updateCategory: (id: number, data: any) => api.put<any>(`/admin/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete<any>(`/admin/categories/${id}`),
  getOrders: (page = 1, status?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    return api.get<any>(`/admin/orders?${params}`);
  },
  getUsers: (page = 1) => api.get<any>(`/admin/users?page=${page}`),
  toggleUser: (id: number) => api.put<any>(`/admin/users/${id}/toggle`),
  getTransactions: (page = 1) => api.get<any>(`/admin/transactions?page=${page}`),
  getSettings: () => api.get<any>('/admin/settings'),
  updateSettings: (data: Record<string, string>) => api.put<any>('/admin/settings', data),
  getCoupons: () => api.get<any>('/admin/coupons'),
  createCoupon: (data: any) => api.post<any>('/admin/coupons', data),
  deleteCoupon: (id: number) => api.delete<any>(`/admin/coupons/${id}`),
  getCommissionRules: () => api.get<any>('/admin/commission-rules'),
  createCommissionRule: (data: any) => api.post<any>('/admin/commission-rules', data),
  deleteCommissionRule: (id: number) => api.delete<any>(`/admin/commission-rules/${id}`),
  getSettlements: () => api.get<any>('/admin/settlements'),
  finalizeSettlement: (id: number) => api.put<any>(`/admin/settlements/${id}/finalize`),
  getPayouts: () => api.get<any>('/admin/payouts'),
  approvePayout: (id: number) => api.put<any>(`/admin/payouts/${id}/approve`),
  rejectPayout: (id: number, reason: string) => api.put<any>(`/admin/payouts/${id}/reject`, { reason }),
  getMessageLogs: (page = 1, filters?: { channel?: string; status?: string }) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters?.channel) params.set('channel', filters.channel);
    if (filters?.status) params.set('status', filters.status);
    return api.get<any>(`/admin/message-logs?${params}`);
  },
};

// ==========================================
// ANALYTICS
// ==========================================
export const getAdminOverview = (days: number = 30) => api.get<any>(`/admin/analytics/overview?days=${days}`);
export const getAdminTopProducts = (days: number = 30) => api.get<any>(`/admin/analytics/top-products?days=${days}`);
export const getAdminTopVendors = (days: number = 30) => api.get<any>(`/admin/analytics/top-vendors?days=${days}`);
export const getAdminFunnel = () => api.get<any>(`/admin/analytics/funnel`);
export const getAdminCategoriesAnalytics = () => api.get<any>(`/admin/analytics/categories`);

export const getVendorOverview = (days: number = 30) => api.get<any>(`/vendor/analytics/overview?days=${days}`);
export const getVendorAnalyticsProducts = (days: number = 30) => api.get<any>(`/vendor/analytics/products?days=${days}`);
