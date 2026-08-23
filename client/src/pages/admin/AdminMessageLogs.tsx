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
      <h2 style={{ marginBottom: 'var(--space-4)' }}>سجل الرسائل</h2>

      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label className="form-label">القناة</label>
            <select className="input" value={channel} onChange={e => { setChannel(e.target.value); setPage(1); }}>
              <option value="">الكل</option>
              <option value="email">البريد الإلكتروني</option>
              <option value="sms">الرسائل النصية</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label className="form-label">الحالة</label>
            <select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
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
          <table className="table">
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
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                    لا توجد رسائل مسجلة
                  </td>
                </tr>
              )}
              {data?.logs?.map((log: any) => (
                <tr key={log.id}>
                  <td>
                    {log.channel === 'email' ? (
                      <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                        <Mail size={14} style={{ marginLeft: 4 }} /> بريد
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        <MessageSquare size={14} style={{ marginLeft: 4 }} /> رسالة نصية
                      </span>
                    )}
                  </td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{log.recipient}</td>
                  <td>{log.templateKey || '-'}</td>
                  <td>
                    {log.status === 'sent' && <span className="badge" style={{ background: 'var(--success-100)', color: 'var(--success-700)' }}><CheckCircle2 size={14} /> تم الإرسال</span>}
                    {log.status === 'failed' && <span className="badge badge--danger" title={log.errorMessage}><AlertCircle size={14} /> فشل</span>}
                    {log.status === 'pending' && <span className="badge"><Clock size={14} /> قيد الانتظار</span>}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>
                      {formatDate(log.createdAt)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                      {formatTime(log.createdAt)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-4)', borderTop: '1px solid var(--neutral-200)' }}>
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
