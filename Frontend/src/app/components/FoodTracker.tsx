import { useRef } from 'react';
import { Coffee, Utensils, Moon, Check, Ticket } from 'lucide-react';
import gsap from 'gsap';

interface FoodTrackerProps {
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
  onMealReceived: (mealType: 'breakfast' | 'lunch' | 'dinner') => void;
}

const mealTypes = [
  { type: 'breakfast' as const, icon: Coffee,   label: 'Breakfast', sub: '7:00 – 9:00 AM',  color: '#f97316', gradient: 'from-orange-500 to-yellow-500' },
  { type: 'lunch'     as const, icon: Utensils, label: 'Lunch',     sub: '1:00 – 2:30 PM',  color: '#10b981', gradient: 'from-emerald-500 to-teal-500' },
  { type: 'dinner'    as const, icon: Moon,     label: 'Dinner',    sub: '7:00 – 9:00 PM',  color: '#a855f7', gradient: 'from-violet-500 to-purple-500' },
];

export function FoodTracker({ meals, onMealReceived }: FoodTrackerProps) {
  const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleClaim = (type: 'breakfast' | 'lunch' | 'dinner') => {
    const el = ticketRefs.current[type];
    if (el) {
      gsap.timeline()
        .to(el, { rotateY: 90, duration: 0.25, ease: 'power2.in' })
        .call(() => onMealReceived(type))
        .to(el, { rotateY: 0, duration: 0.35, ease: 'back.out(1.5)' });
    } else {
      onMealReceived(type);
    }
  };

  const received = Object.values(meals).filter(Boolean).length;

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,135,0.15)', border: '1px solid rgba(0,255,135,0.4)' }}>
            <Ticket className="w-5 h-5 text-[#00ff87]" />
          </div>
          <div>
            <h3 className="text-white font-black">Food Coupons</h3>
            <p className="text-xs text-white/40">{received}/3 claimed today</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1">
          {mealTypes.map(m => (
            <div key={m.type} className="w-2 h-8 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="w-full transition-all duration-500"
                style={{
                  height: meals[m.type] ? '100%' : '0%',
                  background: m.color,
                  boxShadow: meals[m.type] ? `0 0 8px ${m.color}` : 'none',
                  borderRadius: '9999px',
                }} />
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Cards */}
      <div className="space-y-3">
        {mealTypes.map(({ type, icon: Icon, label, sub, color, gradient }) => (
          <div
            key={type}
            ref={el => { ticketRefs.current[type] = el; }}
            className="relative overflow-hidden rounded-[1.5rem] transition-all duration-300"
            style={{
              background: meals[type]
                ? `linear-gradient(135deg, ${color}15, ${color}08)`
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${meals[type] ? color + '50' : 'rgba(255,255,255,0.07)'}`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Perforated left strip */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[1.5rem]"
              style={{ background: `linear-gradient(to bottom, ${color}, ${color}80)` }} />

            {/* Circular cutouts */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>

            <div className="flex items-center p-4 pl-6 gap-4">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient}`}
                style={{ boxShadow: meals[type] ? `0 0 16px ${color}60` : 'none' }}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-base">{label}</div>
                <div className="text-xs" style={{ color: meals[type] ? color : 'rgba(255,255,255,0.3)' }}>{sub}</div>
              </div>

              {/* Dashed separator */}
              <div className="w-px self-stretch mx-1"
                style={{ borderLeft: '1.5px dashed rgba(255,255,255,0.1)' }} />

              {/* Action */}
              {meals[type] ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full flex-shrink-0"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                  <Check className="w-4 h-4" style={{ color }} />
                  <span className="text-sm font-bold" style={{ color }}>Claimed</span>
                </div>
              ) : (
                <button
                  onClick={() => handleClaim(type)}
                  className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105 flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                    boxShadow: `0 4px 12px ${color}40`,
                  }}
                >
                  Claim
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
