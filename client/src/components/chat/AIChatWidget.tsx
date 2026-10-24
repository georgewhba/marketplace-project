import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, storeApi } from '../../api';

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

export const AIChatWidget = () => {
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
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} 
          bg-gradient-to-r from-brand-terracotta to-[#d66c43] text-white hover:shadow-brand-terracotta/30`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-96 h-[500px] max-h-[80vh] max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-terracotta to-[#c95f34] p-4 rounded-t-2xl flex justify-between items-center text-white shrink-0 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
          
          <div className="flex items-center gap-3 relative z-10 w-full pr-2">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg leading-tight">المساعد الذكي</h3>
              <p className="text-white/90 text-xs mt-0.5">متواجد للرد على استفساراتك</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors z-20 shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white"
              title="إغلاق الشات"
              aria-label="إغلاق الشات"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Messages Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-light-sand/30 dark:bg-slate-800/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-brand-dark-brown dark:bg-brand-terracotta text-white rounded-2xl rounded-br-sm shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-brand-dark-brown dark:text-slate-200 shadow-sm border border-brand-sand/30 dark:border-slate-700 rounded-2xl rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-brand-sand/30 dark:border-slate-700 text-brand-terracotta dark:text-brand-terracotta/80 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs text-brand-dark-brown/70 dark:text-slate-400">يفكر...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <div className="p-4 border-t border-brand-sand/30 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              maxLength={1000}
              aria-label="رسالة الشات"
              className="flex-1 resize-none bg-brand-light-sand/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-brand-sand/50 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-terracotta/50 focus:border-transparent max-h-32 min-h-[44px] transition-all"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="إرسال الرسالة"
              title="إرسال"
              className="p-3 h-[44px] w-[44px] flex items-center justify-center bg-brand-terracotta text-white rounded-xl hover:bg-[#c95f34] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
            >
              <Send size={18} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
