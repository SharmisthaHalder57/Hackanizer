import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { ArrowLeft, Users, Activity, TrendingUp, TrendingDown, Minus, Cpu, Wifi } from 'lucide-react';
import { ParticlesBackground } from '../components/ParticlesBackground';

interface RoomOccupancy { room: string; count: number; capacity: number; trend: 'up' | 'down' | 'stable'; }

const INITIAL_ROOMS: RoomOccupancy[] = [
  { room:'101',         count:25,  capacity:30,  trend:'up' },
  { room:'102',         count:18,  capacity:30,  trend:'stable' },
  { room:'103',         count:30,  capacity:30,  trend:'stable' },
  { room:'104',         count:12,  capacity:30,  trend:'down' },
  { room:'105',         count:8,   capacity:30,  trend:'down' },
  { room:'201',         count:22,  capacity:40,  trend:'up' },
  { room:'202',         count:38,  capacity:40,  trend:'up' },
  { room:'203',         count:15,  capacity:40,  trend:'stable' },
  { room:'Cafeteria',   count:45,  capacity:100, trend:'up' },
  { room:'Auditorium',  count:120, capacity:200, trend:'stable' },
];

const getStyle = (pct: number) => {
  if (pct >= 90) return { label: 'Critical', bg: '#fff', text: '#000', border: 'rgba(255,255,255,1)' };
  if (pct >= 70) return { label: 'High',     bg: '#aaa', text: '#000', border: 'rgba(255,255,255,0.6)' };
  if (pct >= 40) return { label: 'Moderate', bg: '#444', text: '#fff', border: 'rgba(255,255,255,0.2)' };
  return              { label: 'Low',      bg: '#111', text: '#fff', border: 'rgba(255,255,255,0.1)' };
};

function MinimalBar({ room, idx }: { room: RoomOccupancy; idx: number }) {
  const pct     = Math.round((room.count / room.capacity) * 100);
  const style   = getStyle(pct);

  return (
    <div className="border p-6 flex flex-col justify-between hover:bg-white/5 transition-colors duration-500 min-h-[220px]"
      style={{ borderColor: style.border }}>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-serif text-lg leading-none">
            {isNaN(Number(room.room)) ? room.room : `RM ${room.room}`}
          </h3>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-2 flex items-center gap-2">
            {room.trend === 'up'   && <TrendingUp   className="w-3 h-3" />}
            {room.trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {room.trend === 'stable'&&<Minus        className="w-3 h-3" />}
            {style.label}
          </div>
        </div>
        <div className="text-right">
          <div className="font-serif text-2xl">{pct}%</div>
          <div className="text-[9px] uppercase tracking-widest text-white/30">{room.count}/{room.capacity}</div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="h-1 bg-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
            style={{ width: `${pct}%`, backgroundColor: style.bg }} />
        </div>
      </div>
    </div>
  );
}

export function LiveHeatmap() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomOccupancy[]>(INITIAL_ROOMS);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const int = setInterval(() => {
      setRooms(prev => prev.map(r => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const nc    = Math.max(0, Math.min(r.capacity, r.count + delta));
        return { ...r, count:nc, trend: nc>r.count ? 'up' : nc<r.count ? 'down' : 'stable' };
      }));
    }, 3000);
    return () => clearInterval(int);
  }, []);

  const totalOcc = rooms.reduce((s,r) => s + r.count, 0);
  const totalCap = rooms.reduce((s,r) => s + r.capacity, 0);
  const overallPct = Math.round((totalOcc / totalCap) * 100);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black flex flex-col py-16 px-8 relative overflow-hidden">
      {/* Background Noise Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="stagger-reveal mb-16 flex flex-col lg:flex-row justify-between items-start gap-12 border-b border-white/10 pb-12">
          <div>
            <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Return
            </button>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Live Feed Active</span>
            </div>
      <ParticlesBackground color="#ffffff" className="fixed inset-0 z-0 opacity-20 mix-blend-screen" />
      <div className="fixed inset-0 bg-gradient-to-b from-[#030303]/40 via-transparent to-[#030303]/80 z-0 pointer-events-none" />
            <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-2">
              Telemetry
            </h1>
            <p className="text-white/60 font-light text-sm uppercase tracking-widest">
              Real-time spatial utilization
            </p>
          </div>

          <div className="flex flex-wrap gap-px bg-white/10 border border-white/10">
            {[
              { icon:Users,    label:'Occupancy',  value:totalOcc,   suffix:'' },
              { icon:Activity, label:'Density',    value:overallPct, suffix:'%' },
              { icon:Cpu,      label:'Zones',      value:rooms.length,suffix:'' },
              { icon:Wifi,     label:'Latency',    value:94,         suffix:'ms' },
            ].map(({ icon:Icon, label, value, suffix }) => (
              <div key={label} className="bg-[#0a0a0a] p-6 min-w-[160px] flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-4 h-4 text-white/40" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</span>
                </div>
                <div className="font-serif text-3xl font-light">
                  {value}<span className="text-base text-white/40 ml-1">{suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Grid */}
        <div className="stagger-reveal grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-16">
          {rooms.map((room, i) => <MinimalBar key={room.room} room={room} idx={i} />)}
        </div>

        {/* Legend */}
        <div className="stagger-reveal border-t border-white/10 pt-12">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-8">Capacity Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label:'Optimal',  range:'0–40%',   bg:'#111', text:'#fff', border:'rgba(255,255,255,0.1)' },
              { label:'Elevated', range:'40–70%',  bg:'#444', text:'#fff', border:'rgba(255,255,255,0.2)' },
              { label:'Dense',    range:'70–90%',  bg:'#aaa', text:'#000', border:'rgba(255,255,255,0.6)' },
              { label:'Critical', range:'90–100%', bg:'#fff', text:'#000', border:'rgba(255,255,255,1)' },
            ].map(({ label, range, bg, text, border }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-12 h-12 flex-shrink-0 border"
                  style={{ backgroundColor: bg, borderColor: border }} />
                <div>
                  <div className="text-xs uppercase tracking-widest font-bold mb-1">{label}</div>
                  <div className="text-[10px] text-white/40 font-serif">{range} Utilization</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
