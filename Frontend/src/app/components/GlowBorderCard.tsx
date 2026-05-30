import { ReactNode } from 'react';

interface GlowBorderCardProps {
  children: ReactNode;
  className?: string;
  color?: string;
  animationDuration?: string;
  padding?: string;
}

export function GlowBorderCard({
  children,
  className = '',
  color = '#00ff87',
  animationDuration = '4s',
  padding = 'p-6',
}: GlowBorderCardProps) {
  return (
    <div className={`relative ${className}`} style={{ padding: 2, borderRadius: '1.25rem' }}>
      {/* Spinning conic gradient ring */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${color} 90deg, transparent 180deg)`,
          animation: `spin-glow ${animationDuration} linear infinite`,
          borderRadius: '1.25rem',
          zIndex: 0,
        }}
      />
      {/* Inner content */}
      <div
        className={`relative z-10 ${padding} rounded-2xl`}
        style={{
          background: 'rgba(12, 6, 30, 0.92)',
          backdropFilter: 'blur(24px)',
          borderRadius: '1.15rem',
        }}
      >
        {children}
      </div>
    </div>
  );
}
