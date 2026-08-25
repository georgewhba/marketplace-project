import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { Mail, MessageSquare, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function AdminMessageLogs() {
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminMessageLogs', page, channel, status],
    queryFn: () => adminApi.getMessageLogs(page, { channel, status }).then(res => res.data),
  });

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  };
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  };

  return (
    <div>
      <h1 className="page-header__title mb-4">سجل الرسائل</h1>

      <div className="card card-body mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="form-group mb-0" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">القناة</label>
            <select className="form-select" value={channel} onChange={e => { setChannel(e.target.value); setPage(1); }}>
              <option value="">الكل</option>
              <option value="email">البريد الإلكتروني</option>
              <option value="sms">الرسائل النصية</option>
            </select>
          </div>
          <div className="form-group mb-0" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">الحالة</label>
            <select className="form-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">الكل</option>
              <option value="sent">تم الإرسال</option>
              <option value="failed">فشل الإرسال</option>
              <option value="pending">قيد الانتظار</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div>جاري التحميل...</div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>القناة</th>
                <th>المستلم</th>
                <th>النوع / القالب</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: 'var(--space-4)' }}>
                    لا توجد رسائل مسجلة
                  </td>
                </tr>
              )}
              {data?.logs?.map((log: any) => (
                <tr key={log.id}>
                  <td>
                    {log.channel === 'email' ? (
                      <span className="badge badge-brand">
                        <Mail size={14} style={{ marginLeft: 4 }} /> بريد
                      </span>
                    ) : (
                      <span className="badge badge-info">
                        <MessageSquare size={14} style={{ marginLeft: 4 }} /> رسالة نصية
                      </span>
                    )}
                  </td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{log.recipient}</td>
                  <td>{log.templateKey || '-'}</td>
                  <td>
                    {log.status === 'sent' && <span className="badge badge-success"><CheckCircle2 size={14} style={{ marginLeft: 4 }} /> تم الإرسال</span>}
                    {log.status === 'failed' && <span className="badge badge-error" title={log.errorMessage}><AlertCircle size={14} style={{ marginLeft: 4 }} /> فشل</span>}
                    {log.status === 'pending' && <span className="badge badge-neutral"><Clock size={14} style={{ marginLeft: 4 }} /> قيد الانتظار</span>}
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                      {formatDate(log.createdAt)}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {formatTime(log.createdAt)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              {Array.from({ length: data.meta.totalPages }).map((_, i) => (
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
