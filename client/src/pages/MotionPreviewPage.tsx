import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';

export default function MotionPreviewPage() {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);

  const toggleVisibility = () => setIsVisible(!isVisible);

  // 1. Simple Fade
  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.decelerate } 
    }
  };

  // 2. Scale
  const scaleVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.decelerate } 
    }
  };

  // 3. Slide
  const slideVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 20 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: motionTokens.duration.base, ...motionTokens.easing.spring } 
    }
  };

  // 4. Staggered List
  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : motionTokens.stagger,
        delayChildren: motionTokens.duration.instant
      }
    }
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.decelerate } 
    }
  };

  // 5. Card Tilt (3D Effect)
  // Using pure CSS transforms for tilt on hover (calculated in React state)
  const [tiltStyle, setTiltStyle] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation based on mouse position relative to center
    // Max rotation 10 degrees for subtlety
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setTiltStyle({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTiltStyle({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="text-3xl font-bold mb-2">Motion Design System Preview</h1>
      <p className="text-muted mb-8">
        This page demonstrates the foundational motion system based on `motionTokens`.
        {shouldReduceMotion && <span className="text-warning ml-2">(Reduced motion is enabled in your OS - animations are simplified)</span>}
      </p>

      <button onClick={toggleVisibility} className="btn btn-primary mb-8">
        Toggle Animations
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        
        {/* 1. Simple Fade */}
        <section>
          <h2 className="text-xl font-bold mb-4">1. Simple Fade</h2>
          <p className="text-sm text-muted mb-4">Used for simple state changes or tooltips. Fast duration.</p>
          <div style={{ minHeight: '100px', padding: 'var(--space-4)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <motion.div
              variants={fadeVariants}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              style={{ padding: 'var(--space-4)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}
            >
              Fading Element
            </motion.div>
          </div>
        </section>

        {/* 2. Scale */}
        <section>
          <h2 className="text-xl font-bold mb-4">2. Scale (Pop-in)</h2>
          <p className="text-sm text-muted mb-4">Used for modals or important focus elements. Fast duration, subtle scale (0.95 to 1.0).</p>
          <div style={{ minHeight: '100px', padding: 'var(--space-4)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <motion.div
              variants={scaleVariants}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              style={{ padding: 'var(--space-4)', background: 'var(--info-50)', color: 'var(--info-700)', borderRadius: 'var(--radius-md)' }}
            >
              Scaling Element
            </motion.div>
          </div>
        </section>

        {/* 3. Slide */}
        <section>
          <h2 className="text-xl font-bold mb-4">3. Slide In</h2>
          <p className="text-sm text-muted mb-4">Used for toasts, side panels, or cards entering the viewport. Base duration, spring easing.</p>
          <div style={{ minHeight: '100px', padding: 'var(--space-4)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <motion.div
              variants={slideVariants}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              style={{ padding: 'var(--space-4)', background: 'var(--success-50)', color: 'var(--success-700)', borderRadius: 'var(--radius-md)' }}
            >
              Sliding Element
            </motion.div>
          </div>
        </section>

        {/* 4. Staggered List */}
        <section>
          <h2 className="text-xl font-bold mb-4">4. Staggered List</h2>
          <p className="text-sm text-muted mb-4">Used for loading lists or grids of cards. Sequential delay.</p>
          <div style={{ minHeight: '200px', padding: 'var(--space-4)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <motion.ul
              variants={listContainerVariants}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
            >
              {[1, 2, 3, 4].map(item => (
                <motion.li
                  key={item}
                  variants={listItemVariants}
                  style={{ padding: 'var(--space-3)', background: 'var(--bg-surface-3)', borderRadius: 'var(--radius-sm)' }}
                >
                  List Item {item}
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </section>

        {/* 5. Card Tilt */}
        <section>
          <h2 className="text-xl font-bold mb-4">5. Card Tilt (Subtle 3D)</h2>
          <p className="text-sm text-muted mb-4">Used rarely to add depth to interactive cards on hover. Perspective and transform, no heavy 3D library.</p>
          <div style={{ minHeight: '300px', padding: 'var(--space-8)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', perspective: '1000px' }}>
            <motion.div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              animate={{ 
                rotateX: tiltStyle.rotateX, 
                rotateY: tiltStyle.rotateY,
                boxShadow: (tiltStyle.rotateX !== 0 || tiltStyle.rotateY !== 0) 
                  ? 'var(--shadow-card-hover)' 
                  : 'var(--shadow-md)'
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 30, 
                mass: 0.5 
              }}
              style={{ 
                width: '300px', 
                height: '200px', 
                background: 'var(--bg-surface)', 
                borderRadius: 'var(--radius-lg)', 
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transformStyle: 'preserve-3d'
              }}
            >
              <div>
                <h3 className="font-bold text-lg mb-2" style={{ transform: 'translateZ(30px)' }}>Premium Card</h3>
                <p className="text-muted text-sm" style={{ transform: 'translateZ(20px)' }}>Hover over me to see the subtle 3D depth effect.</p>
              </div>
              <div style={{ transform: 'translateZ(40px)', alignSelf: 'flex-end' }}>
                <span className="badge badge-primary">Interactive</span>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </div>
  );
}
