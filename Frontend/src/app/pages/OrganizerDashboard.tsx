import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import {
  LogOut, Users, UserCog, Gavel, User, Utensils, MapPin, AlertTriangle,
  Map, BarChart3, Eye, Sparkles, ChevronRight, Activity, Shield, Code2, Loader2
} from 'lucide-react';
import { EntryExitFAB } from '../components/EntryExitFAB';
import { api } from '../../lib/api';
import { ParticlesBackground } from '../components/ParticlesBackground';

interface UserData {
  id: string; name: string; email: string;
  type: 'participant' | 'mentor' | 'judge' | 'volunteer'; currentRoom?: string;
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
}

// Removed static SAMPLE_USERS

const tabs = [
  { id:'overview', label:'Overview',      icon:Activity },
  { id:'users',    label:'All Users',     icon:Users },
  { id:'rooms',    label:'Room Tracking', icon:MapPin },
  { id:'meals',    label:'Food Status',   icon:Utensils },
  { id:'sos',      label:'SOS Alerts',    icon:AlertTriangle },
];

export function OrganizerDashboard() {
  const navigate  = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers]   = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [sosAlerts, setSosAlerts] = useState([
    { id:'1', user:'John Doe', type:'health', message:'Feeling dizzy, need medical attention', timestamp:new Date(), resolved:false },
  ]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.get<any[]>('/users');
        const mapped = data.map(u => ({
          id: String(u.id),
          name: u.full_name,
          email: u.email,
          type: u.role,
          currentRoom: u.current_room,
          meals: { breakfast: false, lunch: false, dinner: false }
        }));
        setUsers(mapped);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
      tl.from('.content-panel', { opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4');
    }, containerRef);
    return () => ctx.revert();
  }, [activeTab]);

  const stats = {
    participants: users.filter(u => u.type==='participant').length,
    mentors:      users.filter(u => u.type==='mentor').length,
    judges:       users.filter(u => u.type==='judge').length,
    volunteers:   users.filter(u => u.type==='volunteer').length,
    activeSOS:    sosAlerts.filter(a => !a.resolved).length,
  };

  const statCards = [
    { label:'Participants', value:stats.participants },
    { label:'Mentors',      value:stats.mentors },
    { label:'Judges',       value:stats.judges },
    { label:'Volunteers',   value:stats.volunteers },
    { label:'Active SOS',   value:stats.activeSOS },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black flex flex-col lg:flex-row overflow-hidden relative">
      {/* Background Noise Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* LEFT PANEL - Navigation */}
      <aside className="lg:w-[350px] lg:h-screen lg:fixed top-0 left-0 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between p-8 relative z-10 bg-[#030303] overflow-hidden ">
        <ParticlesBackground color="#ffffff" className="absolute inset-0 z-0 opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/40 via-transparent to-[#030303]/80 z-0 pointer-events-none" />
        <div>
          <div className="stagger-reveal flex items-center gap-3 cursor-pointer group mb-12">
            <div className="w-8 h-8 flex items-center justify-center border border-white/20 group-hover:border-white/60 transition-colors duration-500">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-sm tracking-[0.25em] uppercase">Hackanizer</span>
          </div>

          <div className="stagger-reveal mb-8">
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/50 mb-2 block">Control Center</span>
            <h1 className="text-3xl font-serif leading-tight font-light truncate">
              Organizer
            </h1>
          </div>

          <nav className="stagger-reveal flex flex-col gap-2 mb-12">
            {tabs.map(({ id, label, icon:Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center justify-between px-4 py-4 border transition-all duration-300
                  ${activeTab === id ? 'border-white bg-white text-black' : 'border-transparent text-white/60 hover:border-white/10 hover:bg-white/5'}`}>
                <div className="flex items-center gap-4">
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold">{label}</span>
                </div>
                {activeTab === id && <ChevronRight className="w-3 h-3" />}
                {id === 'sos' && stats.activeSOS > 0 && (
                  <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border ${activeTab === id ? 'border-black text-black' : 'border-[#B76E79] text-[#B76E79]'}`}>
                    {stats.activeSOS} Alert{stats.activeSOS > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="stagger-reveal space-y-4">
          <div className="flex gap-2">
            <button onClick={() => navigate('/heatmap')} className="flex-1 flex items-center justify-center gap-2 py-3 border border-white/10 hover:bg-white/5 transition-colors">
              <Map className="w-3 h-3" />
              <span className="text-[9px] uppercase tracking-[0.2em]">Map</span>
            </button>
            <button onClick={() => navigate('/reports')} className="flex-1 flex items-center justify-center gap-2 py-3 border border-white/10 hover:bg-white/5 transition-colors">
              <BarChart3 className="w-3 h-3" />
              <span className="text-[9px] uppercase tracking-[0.2em]">Data</span>
            </button>
          </div>
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 py-4 border border-white/10 hover:bg-white hover:text-black transition-colors duration-300">
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL - Content Area */}
      <main className="lg:ml-[350px] flex-1 min-h-screen relative z-10 bg-[#050505] p-8 md:p-12 lg:p-16 overflow-y-auto content-panel">
        <div className="max-w-5xl mx-auto">
          
          <header className="border-b border-white/10 pb-8 mb-12">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">{tabs.find(t => t.id === activeTab)?.label}</h2>
            <p className="font-serif text-2xl md:text-3xl font-light text-white/80 max-w-2xl leading-snug">
              Manage operations, monitor vitals, and coordinate the collective from the command center.
            </p>
          </header>

          {/* Dynamic Content Based on Tab */}
          <div className="space-y-12">
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {statCards.map(({ label, value }) => (
                    <div key={label} className="p-5 border border-white/10 bg-[#0a0a0a]">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-3">{label}</div>
                      <div className="font-serif text-3xl font-light">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="border border-white/10 p-8 bg-[#0a0a0a]">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-6 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> System Automations
                    </h3>
                    <div className="space-y-4">
                      {[
                        'Smart mentor matching',
                        'Real-time crowd density tracking',
                        'Automated analytics generation',
                        'Predictive queue management',
                      ].map(f => (
                        <div key={f} className="flex items-center gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                          <span className="text-[10px] border border-white/20 p-1">SYS</span>
                          <span className="text-sm font-light text-white/70">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-white/10 p-8 bg-[#0a0a0a]">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-6 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Infrastructure Status
                    </h3>
                    <div className="space-y-6">
                      {[
                        { label:'API Gateway', pct:99.9 },
                        { label:'Database Nodes', pct:100 },
                        { label:'Event Bus', pct:98.5 },
                      ].map(({ label, pct }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-white/70 font-light">{label}</span>
                            <span className="font-serif">{pct}% Operational</span>
                          </div>
                          <div className="h-1 bg-white/5 relative">
                            <div className="absolute top-0 left-0 h-full bg-white" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center py-16 text-white/40">
                    <Loader2 className="w-6 h-6 animate-spin mr-3" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Synchronizing Personnel...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-16 text-white/40 text-[10px] uppercase tracking-widest font-bold">
                    No users found.
                  </div>
                ) : (
                  users.map(user => (
                    <div key={user.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-white/10 bg-[#0a0a0a] hover:border-white/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-serif text-lg">{user.name}</span>
                          <span className="text-[9px] uppercase tracking-widest border border-white/20 px-2 py-0.5 text-white/60">
                            {user.type}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 font-light">{user.email}</p>
                      </div>
                      {user.currentRoom && (
                        <div className="flex items-center gap-2 text-xs text-white/40 font-light border-l border-white/10 pl-4">
                          <MapPin className="w-3 h-3" /> {user.currentRoom}
                        </div>
                      )}
                      <button className="md:ml-4 px-4 py-2 text-[9px] uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black transition-colors">
                        Inspect
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ROOMS */}
            {activeTab === 'rooms' && (
              <div className="grid md:grid-cols-2 gap-4">
                {['101','102','103','104','105','Cafeteria','Auditorium'].map(room => {
                  const occ = users.filter(u => u.currentRoom === room);
                  const cap = room === 'Auditorium' ? 200 : room === 'Cafeteria' ? 100 : 30;
                  const pct = Math.round((occ.length / cap) * 100);
                  return (
                    <div key={room} className="border border-white/10 p-6 bg-[#0a0a0a]">
                      <div className="flex justify-between items-end mb-4">
                        <h3 className="font-serif text-xl font-light">{room}</h3>
                        <span className="text-2xl font-light">
                          {occ.length}<span className="text-sm text-white/40">/{cap}</span>
                        </span>
                      </div>
                      <div className="h-1 bg-white/5 relative mb-3">
                        <div className="absolute top-0 left-0 h-full bg-white transition-all duration-700" style={{ width:`${pct}%` }} />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40">{pct}% Capacity</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MEALS */}
            {activeTab === 'meals' && (
              <div className="space-y-6">
                {(['breakfast','lunch','dinner'] as const).map(meal => {
                  const received = users.filter(u => u.meals[meal]).length;
                  const pct = (received / users.length) * 100;
                  return (
                    <div key={meal} className="border border-white/10 p-8 bg-[#0a0a0a]">
                      <div className="flex justify-between items-end mb-6">
                        <h3 className="font-serif text-2xl font-light capitalize">{meal}</h3>
                        <div className="text-right">
                          <span className="text-3xl font-light">
                            {received}<span className="text-lg text-white/40">/{users.length}</span>
                          </span>
                        </div>
                      </div>
                      <div className="h-1 bg-white/5 relative mb-4">
                        <div className="absolute top-0 left-0 h-full bg-white transition-all duration-700" style={{ width:`${pct}%` }} />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40">
                        {users.length - received} rations remaining
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SOS */}
            {activeTab === 'sos' && (
              <div className="space-y-4">
                {sosAlerts.length === 0 ? (
                  <div className="text-center py-16 border border-white/10 bg-[#0a0a0a]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">No active alerts. System optimal.</p>
                  </div>
                ) : (
                  sosAlerts.map(alert => (
                    <div key={alert.id} className={`p-6 border transition-colors ${alert.resolved ? 'border-white/10 bg-[#0a0a0a]' : 'border-[#B76E79]/40 bg-[#B76E79]/5'}`}>
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                        <div>
                          <h3 className="font-serif text-xl font-light mb-2">{alert.user}</h3>
                          <span className="text-[9px] uppercase tracking-widest border border-white/20 px-2 py-0.5 text-white/60">
                            {alert.type}
                          </span>
                        </div>
                        {!alert.resolved && (
                          <button onClick={() => setSosAlerts(sosAlerts.map(a => a.id===alert.id ? {...a,resolved:true} : a))}
                            className="px-6 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border border-[#B76E79] text-[#B76E79] hover:bg-[#B76E79] hover:text-white transition-colors">
                            Resolve Alert
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-light text-white/70 leading-relaxed border-t border-white/5 pt-4">
                        {alert.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <EntryExitFAB
        currentRoom={currentRoom}
        onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)}
        roleLabel="Organizer"
        roleColor="#fff"
      />
    </div>
  );
}
