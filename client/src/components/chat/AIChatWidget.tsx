import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, storeApi } from '../../api';
import { useLanguage } from '../../i18n';

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

export const AIChatWidget = () => {
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'مرحباً! أنا المساعد الذكي للمتجر. كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: settingsRes } = useQuery({
    queryKey: ['store-settings'],
    queryFn: () => storeApi.getSettings(),
    staleTime: 60_000,
  });

  const aiEnabled = (settingsRes?.data as any)?.ai_enabled !== 'false' && (settingsRes?.data as any)?.aiEnabled !== false;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!aiEnabled) {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.filter((_, i) => i > 0).slice(-14);

      const res = await api.post<{ reply: string }>('/chat', {
        message: userMsg.text,
        history
      });

      const replyText = (res as any)?.reply || (res as any)?.data?.reply || 'عفواً، لم أتمكن من معالجة طلبك الآن.';
      setMessages(prev => [...prev, { role: 'model', text: replyText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: err.message || 'عذراً، خدمة المساعد الذكي غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="فتح المساعد الذكي"
        title="المساعد الذكي"
        style={{
          position: 'fixed',
          bottom: 24,
          insetInlineEnd: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
          color: '#ffffff',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 350,
          transition: 'all 0.25s ease',
          transform: isOpen ? 'scale(0)' : 'scale(1)',
          opacity: isOpen ? 0 : 1,
          pointerEvents: isOpen ? 'none' : 'auto',
        }}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          insetInlineEnd: 24,
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          height: 500,
          maxHeight: '80vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-2xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 350,
          transition: 'all 0.25s ease',
          transform: isOpen ? 'scale(1)' : 'scale(0.92)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4a1f10 0%, var(--brand-600) 100%)',
            padding: '14px 16px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} color="#fde68a" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>المساعد الذكي</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>متواجد للرد على استفساراتك</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            title="إغلاق الشات"
            aria-label="إغلاق الشات"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Box */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            background: 'var(--bg-page)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  borderRadius: 'var(--radius-lg)',
                  background: msg.role === 'user' ? 'var(--brand-500)' : 'var(--bg-surface)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--brand-500)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.8rem',
                }}
              >
                <Loader2 size={16} className="spin" />
                <span className="text-secondary">يفكر...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="اكتب رسالتك هنا..."
            maxLength={1000}
            aria-label="رسالة الشات"
            className="form-input"
            style={{
              flex: 1,
              resize: 'none',
              minHeight: 42,
              maxHeight: 100,
              padding: '9px 12px',
              fontSize: '0.875rem',
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            aria-label="إرسال الرسالة"
            title="إرسال"
            className="btn btn-primary"
            style={{ width: 42, height: 42, padding: 0, borderRadius: 'var(--radius-md)' }}
          >
            <Send size={17} style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
          </button>
        </div>
      </div>
    </>
  );
};
