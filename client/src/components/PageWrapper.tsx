import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';

export function PageWrapper({ children, className }: { children: React.ReactNode, className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.decelerate }
      }}
      exit={{ 
        opacity: 0,
        transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.accelerate }
      }}
    >
      {children}
    </motion.div>
  );
}
