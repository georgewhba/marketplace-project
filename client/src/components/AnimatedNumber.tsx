import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  
  const display = useTransform(spring, (current) => {
    const formatted = current.toLocaleString('ar-EG', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return prefix + formatted + suffix;
  });

  useEffect(() => {
    if (shouldReduceMotion) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, spring, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return <>{prefix}{value.toLocaleString('ar-EG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
  }

  return <motion.span>{display}</motion.span>;
}
