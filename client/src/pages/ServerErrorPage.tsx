import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCcw } from 'lucide-react';

export default function ServerErrorPage() {
  return (
    <div className="container page-content">
      <div className="empty-state">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
          width="160"
          height="160"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          {/* Abstract geometric 500 representation in Terracotta and Gold */}
          <rect width="200" height="200" rx="40" fill="var(--bg-surface-2)" />
          
          <g transform="translate(100, 100)">
            {/* Background structure representing an broken connection */}
            <path d="M-60 0 L-20 0 L0 -30 L20 0 L60 0" fill="none" stroke="var(--border-color)" strokeWidth="4" strokeLinejoin="round" />
            
            {/* Main focal point */}
            <rect x="-25" y="-15" width="50" height="30" rx="4" fill="var(--brand-500)" />
            <rect x="-15" y="-5" width="30" height="10" rx="2" fill="var(--brand-700)" />
            
            {/* Disconnected wire/circuit elements */}
            <path d="M-25 15 L-25 35 L-40 35" fill="none" stroke="var(--accent-500)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25 15 L25 35 L40 35" fill="none" stroke="var(--accent-500)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Warning node */}
            <circle cx="0" cy="40" r="10" fill="var(--error-500)" />
            <path d="M0 35 L0 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="46" r="1.5" fill="white" />
          </g>
        </svg>

        <h1 className="empty-state__title" style={{ fontSize: 'var(--font-size-2xl)' }}>
          500 — خطأ في الخادم
        </h1>
        <p className="empty-state__description" style={{ fontSize: 'var(--font-size-base)' }}>
          حدث خطأ غير متوقع في خوادمنا. نحن نعمل على إصلاحه بأسرع وقت ممكن. يرجى المحاولة مرة أخرى لاحقاً.
        </p>
        
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <button onClick={() => window.location.reload()} className="btn btn-primary btn-lg">
            <RefreshCcw size={18} />
            تحديث الصفحة
          </button>
          <Link to="/" className="btn btn-secondary btn-lg">
            العودة للرئيسية
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
