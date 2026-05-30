import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { ArrowLeft, Download, TrendingUp, Users, MessageSquare, Utensils, Sparkles } from 'lucide-react';
import { ParticlesBackground } from '../components/ParticlesBackground';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const attendanceData = [
  { time:'8 AM',  participants:15, mentors:3,  judges:1, volunteers:5  },
  { time:'10 AM', participants:45, mentors:8,  judges:3, volunteers:7  },
  { time:'12 PM', participants:60, mentors:10, judges:5, volunteers:10 },
  { time:'2 PM',  participants:58, mentors:9,  judges:4, volunteers:8  },
  { time:'4 PM',  participants:55, mentors:8,  judges:5, volunteers:9  },
  { time:'6 PM',  participants:40, mentors:6,  judges:3, volunteers:6  },
];
const queryData    = [{ category:'Technical',count:45},{ category:'Design',count:28},{ category:'Business',count:15},{ category:'General',count:32}];
const feedbackData = [{ rating:'5★',count:35},{ rating:'4★',count:25},{ rating:'3★',count:12},{ rating:'2★',count:5},{ rating:'1★',count:3}];
const userTypeData = [{ name:'Participants',value:60,color:'#fff'},{ name:'Mentors',value:10,color:'#ccc'},{ name:'Judges',value:5,color:'#888'},{ name:'Volunteers',value:10,color:'#444'}];
const mealData     = [{ meal:'Breakfast',dist:78,total:85},{ meal:'Lunch',dist:82,total:85},{ meal:'Dinner',dist:65,total:85}];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#050505] border border-white/20 p-4 text-xs font-serif shadow-2xl">
      {label && <p className="text-white/40 mb-2 font-sans uppercase tracking-[0.2em]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="mb-1" style={{ color: p.color || p.fill || '#fff' }}>
          {p.name||p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function ReportsAnalytics() {
  const navigate     = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleDownload = () => {
    const data = { generated: new Date().toISOString(), attendanceData, queryData, feedbackData, userTypeData, mealData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href:url, download:`hackanizer-report-${new Date().toISOString().split('T')[0]}.json` }).click();
    URL.revokeObjectURL(url);
  };

  const axisProps  = { stroke: 'rgba(255,255,255,0.1)' };
  const tickProps  = { fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'serif' };

  const statCards = [
    { icon:Users,         label:'Attendees',       value:85,  suffix:'',   color:'#fff' },
    { icon:MessageSquare, label:'Queries Resolved',value:120, suffix:'',   color:'#fff' },
    { icon:TrendingUp,    label:'Avg Rating',      value:4.2, suffix:'/5', color:'#fff' },
    { icon:Utensils,      label:'Provisions',      value:88,  suffix:'%',  color:'#fff' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black flex flex-col py-16 px-8 relative overflow-hidden">
      {/* Background Noise Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="stagger-reveal mb-16 border-b border-white/10 pb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Return
            </button>
            <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-2">
              Intelligence
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Post-Action Report & Analytics
            </p>
          </div>
      <ParticlesBackground color="#ffffff" className="fixed inset-0 z-0 opacity-20 mix-blend-screen" />
      <div className="fixed inset-0 bg-gradient-to-b from-[#030303]/40 via-transparent to-[#030303]/80 z-0 pointer-events-none" />
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-4 border border-white text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-black transition-colors">
            <Download className="w-4 h-4" /> Export Ledger
          </button>
        </div>

        {/* Stat Cards */}
        <div className="stagger-reveal grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10 mb-12">
          {statCards.map(({ icon:Icon, label, value, suffix }) => (
            <div key={label} className="bg-[#050505] p-8 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-8 text-white/40">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-[0.2em]">{label}</span>
              </div>
              <div className="font-serif text-4xl font-light">
                {value}<span className="text-xl text-white/40 ml-1">{suffix}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="stagger-reveal grid lg:grid-cols-2 gap-8 mb-8">
          <div className="border border-white/10 p-8 bg-[#0a0a0a]">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-8 border-b border-white/5 pb-4">
              Attendance Velocity
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={attendanceData}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" tick={tickProps} axisLine={axisProps} tickLine={false} />
                <YAxis tick={tickProps} axisLine={axisProps} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Area type="monotone" dataKey="participants" stroke="#fff" fill="url(#gP)" strokeWidth={2} />
                <Area type="monotone" dataKey="mentors"      stroke="#aaa" fill="transparent" strokeWidth={1} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="judges"       stroke="#666" fill="transparent" strokeWidth={1} />
                <Area type="monotone" dataKey="volunteers"   stroke="#444" fill="transparent" strokeWidth={1} strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border border-white/10 p-8 bg-[#0a0a0a]">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-8 border-b border-white/5 pb-4">
              Demographics
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={userTypeData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={2}
                  stroke="none"
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={{ stroke:'rgba(255,255,255,0.2)' }}
                  style={{ fontFamily: 'serif', fontSize: 12, fill: '#fff' }}>
                  {userTypeData.map((e,i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="stagger-reveal grid lg:grid-cols-3 gap-8 mb-12">
          <div className="border border-white/10 p-8 bg-[#0a0a0a]">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-8 border-b border-white/5 pb-4">Query Taxonomy</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={queryData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="category" tick={tickProps} axisLine={axisProps} tickLine={false} />
                <YAxis tick={tickProps} axisLine={axisProps} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" fill="#fff" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border border-white/10 p-8 bg-[#0a0a0a]">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-8 border-b border-white/5 pb-4">Sentiment Analysis</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={feedbackData} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={tickProps} axisLine={axisProps} tickLine={false} />
                <YAxis type="category" dataKey="rating" tick={tickProps} axisLine={axisProps} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" fill="#fff" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border border-white/10 p-8 bg-[#0a0a0a]">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-8 border-b border-white/5 pb-4">Provision Consumption</h2>
            <div className="space-y-6">
              {mealData.map(({ meal, dist, total }) => {
                const pct = (dist / total) * 100;
                return (
                  <div key={meal}>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/80">{meal}</span>
                      <span className="text-sm font-serif">{dist}/{total}</span>
                    </div>
                    <div className="h-1 bg-white/10 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-white transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="stagger-reveal border border-white p-8 md:p-12 bg-white text-black relative">
          <div className="flex items-center gap-3 mb-10 border-b border-black/10 pb-6">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold">Synthesized Insights</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { num:'01', title:'Peak Density', text:'Maximal occupancy observed at 12 PM. Optimize scheduling of major events around this window.' },
              { num:'02', title:'Resource Allocation', text:'Technical inquiries constituted 40% of queries. Advise increasing technical mentorship staffing by 15%.' },
              { num:'03', title:'Experience Metrics', text:'Overall satisfaction index is high (4.2). Venue layout received top praise; network infrastructure cited for improvement.' },
            ].map(({ num, title, text }) => (
              <div key={title} className="relative">
                <div className="text-4xl font-serif text-black/20 mb-4">{num}</div>
                <h3 className="font-bold text-sm uppercase tracking-widest mb-3">{title}</h3>
                <p className="text-sm font-light text-black/70 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
