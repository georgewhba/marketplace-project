import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Bell, Package, Tag, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<any>('/auth/me/notifications').then(res => res.data),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id?: number) => {
      if (id) {
        return api.put(`/auth/me/notifications/${id}/read`);
      }
      return api.put('/auth/me/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  if (isLoading) {
    return (
      <div className="container page-content" style={{ maxWidth: 800 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 84, marginBottom: 'var(--space-3)' }} />)}
      </div>
    );
  }

  const getIcon = (category: string) => {
    switch (category) {
      case 'order_updates': return <Package size={20} />;
      case 'promotions': return <Tag size={20} />;
      case 'stock_alerts': return <AlertCircle size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getColor = (category: string) => {
    switch (category) {
      case 'order_updates': return 'var(--brand-600)';
      case 'promotions': return 'var(--success-600)';
      case 'stock_alerts': return 'var(--warning-600)';
      default: return 'var(--text-secondary)';
    }
  };

  const getBackground = (category: string) => {
    switch (category) {
      case 'order_updates': return 'var(--brand-50)';
      case 'promotions': return 'var(--success-50)';
      case 'stock_alerts': return 'var(--warning-50)';
      default: return 'var(--bg-surface-2)';
    }
  };

  const unreadCount = notifications?.filter((n: any) => !n.isRead)?.length || 0;

  return (
    <div className="container page-content" style={{ maxWidth: 820 }}>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <Bell size={26} className="text-brand" />
          <h1 className="page-header__title m-0">الإشعارات</h1>
          {unreadCount > 0 && (
            <span className="badge badge-brand" style={{ fontSize: '0.85rem' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => markAsReadMutation.mutate(undefined)}
            disabled={markAsReadMutation.isPending}
          >
            <CheckCircle2 size={16} /> تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {!notifications || notifications.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Bell size={48} className="empty-state__icon" />
              <div className="empty-state__title">لا توجد إشعارات حالياً</div>
            </div>
          </div>
        ) : (
          notifications.map((notification: any) => (
            <div
              key={notification.id}
              className="card"
              style={{
                padding: 'var(--space-4) var(--space-5)',
                display: 'flex',
                gap: 'var(--space-4)',
                opacity: notification.isRead ? 0.78 : 1,
                borderInlineStart: !notification.isRead ? '4px solid var(--brand-500)' : '4px solid transparent',
                cursor: !notification.isRead || notification.actionUrl ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                if (!notification.isRead && !markAsReadMutation.isPending) {
                  markAsReadMutation.mutate(notification.id);
                }
                if (notification.actionUrl) {
                  navigate(notification.actionUrl);
                }
              }}
            >
              <div style={{
                background: getBackground(notification.type),
                color: getColor(notification.type),
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {getIcon(notification.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-start gap-2 mb-1 flex-wrap">
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: !notification.isRead ? 700 : 600 }}>
                    {notification.title}
                  </h3>
                  <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                <p className="text-secondary m-0" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {notification.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
