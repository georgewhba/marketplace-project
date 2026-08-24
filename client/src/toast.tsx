import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from './lib/motion-tokens';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const addToastPublic = useCallback((message: string, type: ToastType = 'info') => addToast(type, message), [addToast]);
  const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const error = useCallback((msg: string) => addToast('error', msg), [addToast]);
  const info = useCallback((msg: string) => addToast('info', msg), [addToast]);
  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toasts, addToast: addToastPublic, success, error, info, dismiss }}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id} 
              layout
              className={`toast toast-${t.type}`} 
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20, scale: shouldReduceMotion ? 1 : 0.95 }}
              animate={t.type === 'error' && !shouldReduceMotion 
                ? { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -8, 8, 0] } 
                : { opacity: 1, y: 0, scale: 1, x: 0 }
              }
              exit={{ opacity: 0, scale: 0.95, transition: { duration: motionTokens.duration.fast } }}
              transition={t.type === 'error' && !shouldReduceMotion 
                ? { duration: motionTokens.duration.base, x: { duration: 0.4 } }
                : { duration: motionTokens.duration.base, ...motionTokens.easing.spring }
              }
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
