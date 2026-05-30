import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function MagneticCursor() {
  const cursorRef  = useRef<HTMLDivElement>(null);
  const trailRef   = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const trail  = trailRef.current;
    if (!cursor || !trail) return;

    let mouseX = window.innerWidth  / 2;
    let mouseY = window.innerHeight / 2;
    let trailX = mouseX;
    let trailY = mouseY;
    let raf: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      gsap.to(cursor, { x: mouseX - 8, y: mouseY - 8, duration: 0.1, ease: 'power1.out' });
    };

    const animate = () => {
      trailX += (mouseX - trailX) * 0.1;
      trailY += (mouseY - trailY) * 0.1;
      gsap.set(trail, { x: trailX - 20, y: trailY - 20 });
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onEnter = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      isHovering.current = true;
      gsap.to(cursor, { scale: 2.5, opacity: 0.5, duration: 0.25, ease: 'power2.out' });
      gsap.to(trail,  { scale: 1.6, opacity: 0.2, duration: 0.3, ease: 'power2.out' });

      // Magnetic effect
      const onMove = (ev: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top  + rect.height / 2;
        const dx = (ev.clientX - cx) * 0.25;
        const dy = (ev.clientY - cy) * 0.25;
        gsap.to(el, { x: dx, y: dy, duration: 0.4, ease: 'power2.out' });
      };
      const onLeaveEl = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeaveEl);
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeaveEl);
    };

    const onLeave = () => {
      isHovering.current = false;
      gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(trail,  { scale: 1, opacity: 0.4, duration: 0.3, ease: 'power2.out' });
    };

    // Attach to interactive elements
    const attachToElements = () => {
      const targets = document.querySelectorAll('button, a, [data-magnetic]');
      targets.forEach(el => {
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
      });
      return targets;
    };

    const targets = attachToElements();
    window.addEventListener('mousemove', onMouseMove);

    // Re-attach on DOM changes
    const observer = new MutationObserver(() => attachToElements());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      targets.forEach(el => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Inner dot cursor */}
      <div ref={cursorRef} className="fixed top-0 left-0 w-4 h-4 rounded-full pointer-events-none z-[9999]"
        style={{
          background: 'white',
          mixBlendMode: 'difference',
          willChange: 'transform',
        }} />
      {/* Outer ring trail */}
      <div ref={trailRef} className="fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[9998] opacity-40"
        style={{
          border: '1.5px solid rgba(168,85,247,0.8)',
          willChange: 'transform',
          boxShadow: '0 0 12px rgba(168,85,247,0.4)',
        }} />
    </>
  );
}
