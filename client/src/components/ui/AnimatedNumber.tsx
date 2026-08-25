import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { motionTokens } from '../../lib/motion-tokens';

interface AnimatedNumberProps {
  value: number;
  format?: (val: number) => string;
  className?: string;
}

export function AnimatedNumber({ 
  value, 
  format = (val) => Math.round(val).toLocaleString('ar-EG'),
  className = ""
}: AnimatedNumberProps) {
  const spring = useSpring(value, { 
    stiffness: motionTokens.easing.spring.stiffness,
    damping: motionTokens.easing.spring.damping,
    mass: 1
  });
  
  const display = useTransform(spring, (current) => format(current));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
