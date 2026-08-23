import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
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
          {/* Abstract geometric 404 representation in Terracotta and Gold */}
          <rect width="200" height="200" rx="40" fill="var(--bg-surface-2)" />
          
          <g transform="translate(100, 100)">
            {/* Background elements */}
            <circle cx="0" cy="0" r="60" fill="none" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="8 8" />
            
            {/* Main geometric composition */}
            <path d="M-40 -20 L-20 -40 L0 -20 L-20 0 Z" fill="var(--brand-500)" />
            <path d="M0 -20 L20 -40 L40 -20 L20 0 Z" fill="var(--brand-500)" />
            
            {/* The offset elements creating visual interest */}
            <path d="M-20 0 L0 20 L20 0" fill="none" stroke="var(--accent-500)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Floating details */}
            <circle cx="-30" cy="30" r="6" fill="var(--brand-700)" />
            <rect x="25" y="25" width="10" height="10" rx="2" fill="var(--accent-400)" />
          </g>
        </svg>

        <h1 className="empty-state__title" style={{ fontSize: 'var(--font-size-2xl)' }}>
          404 — الصفحة غير موجودة
        </h1>
        <p className="empty-state__description" style={{ fontSize: 'var(--font-size-base)' }}>
          عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. قد تكون حذفت أو تم تغيير رابطها.
        </p>
        
        <Link to="/" className="btn btn-primary btn-lg">
          العودة للرئيسية
          <ArrowLeft size={18} />
        </Link>
      </div>
    </div>
  );
}
