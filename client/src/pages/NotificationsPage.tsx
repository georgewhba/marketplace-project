import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Bell, Package, Tag, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

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
    }
  });

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  };

  if (isLoading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>جاري التحميل...</div>;
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
      case 'order_updates': return 'var(--primary-600)';
      case 'promotions': return 'var(--success-600)';
      case 'stock_alerts': return 'var(--warning-600)';
      default: return 'var(--neutral-600)';
    }
  };

  const getBackground = (category: string) => {
    switch (category) {
      case 'order_updates': return 'var(--primary-100)';
      case 'promotions': return 'var(--success-100)';
      case 'stock_alerts': return 'var(--warning-100)';
      default: return 'var(--neutral-100)';
    }
  };

  const unreadCount = notifications?.filter((n: any) => !n.isRead)?.length || 0;

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Bell size={28} />
          الإشعارات
          {unreadCount > 0 && (
            <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: '1rem' }}>
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button 
            className="btn btn-outline btn-sm" 
            onClick={() => markAsReadMutation.mutate()}
            disabled={markAsReadMutation.isPending}
          >
            <CheckCircle2 size={16} /> تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {notifications?.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--neutral-500)' }}>
            <Bell size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.2 }} />
            <p>لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          notifications?.map((notification: any) => (
            <div 
              key={notification.id} 
              className="card" 
              style={{ 
                padding: 'var(--space-4)', 
                display: 'flex', 
                gap: 'var(--space-4)',
                opacity: notification.isRead ? 0.7 : 1,
                borderLeft: !notification.isRead ? '4px solid var(--primary-500)' : '4px solid transparent',
                cursor: !notification.isRead ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                if (!notification.isRead && !markAsReadMutation.isPending) {
                  markAsReadMutation.mutate(notification.id);
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
                flexShrink: 0
              }}>
                {getIcon(notification.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-1)' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: !notification.isRead ? 700 : 500 }}>
                    {notification.title}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', whiteSpace: 'nowrap' }}>
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.875rem' }}>
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
