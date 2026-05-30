import { useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';

interface ThreeDTiltProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
}

export function ThreeDTilt({ children, className = '', intensity = 12, glare = true }: ThreeDTiltProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const glareEl = glareRef.current;
    if (!card) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      gsap.to(card, {
        rotateY: dx * intensity,
        rotateX: -dy * intensity,
        transformPerspective: 900,
        duration: 0.4,
        ease: 'power2.out',
      });

      if (glareEl && glare) {
        const glareX = (e.clientX - rect.left) / rect.width * 100;
        const glareY = (e.clientY - rect.top) / rect.height * 100;
        gsap.to(glareEl, {
          opacity: 0.15,
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.6), transparent 70%)`,
          duration: 0.3,
        });
      }
    };

    const onMouseLeave = () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
      });
      if (glareEl) {
        gsap.to(glareEl, { opacity: 0, duration: 0.4 });
      }
    };

    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('mouseleave', onMouseLeave);
    return () => {
      card.removeEventListener('mousemove', onMouseMove);
      card.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [intensity, glare]);

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0"
          style={{ zIndex: 10 }}
        />
      )}
    </div>
  );
}
