import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface AnimatedCounterProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
  trigger?: boolean;
}

export function AnimatedCounter({ to, duration = 1.8, suffix = '', prefix = '', decimals = 0, className = '', trigger = true }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const obj = useRef({ val: 0 });

  useEffect(() => {
    if (!ref.current || !trigger) return;
    obj.current.val = 0;
    gsap.to(obj.current, {
      val: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${obj.current.val.toFixed(decimals)}${suffix}`;
        }
      },
    });
  }, [to, trigger, duration, suffix, prefix, decimals]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}
