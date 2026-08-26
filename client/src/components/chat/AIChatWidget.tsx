import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../api';

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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Exclude the last initial message from history for brevity
      const history = messages.filter((_, i) => i > 0);
      
      const res = await api.post<{ reply: string }>('/chat', {
        message: userMsg.text,
        history
      });

      setMessages(prev => [...prev, { role: 'model', text: res.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: err.response?.data?.error || 'حدث خطأ. يرجى المحاولة لاحقاً.' 
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
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} 
          bg-gradient-to-r from-brand-terracotta to-[#d66c43] text-white hover:shadow-brand-terracotta/30`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-96 h-[500px] max-h-[80vh] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-terracotta to-[#c95f34] p-4 rounded-t-2xl flex justify-between items-center text-white shrink-0 shadow-sm relative overflow-hidden">
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">المساعد الذكي</h3>
              <p className="text-white/80 text-xs">متواجد للرد على استفساراتك</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-light-sand/30">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-brand-dark-brown text-white rounded-br-sm' 
                    : 'bg-white text-brand-dark-brown shadow-sm border border-brand-sand/30 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-brand-sand/30 text-brand-terracotta shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={18} className="animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <div className="p-4 border-t border-brand-sand/30 bg-white rounded-b-2xl shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 resize-none bg-brand-light-sand/50 border border-brand-sand/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-terracotta/50 focus:border-transparent max-h-32 min-h-[44px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-brand-terracotta text-white rounded-xl hover:bg-[#c95f34] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={18} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
