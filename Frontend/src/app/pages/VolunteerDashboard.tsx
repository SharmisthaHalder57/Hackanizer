import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { LogOut, ClipboardCheck, CheckCircle, MessageCircle, Code2, Activity } from 'lucide-react';
import { SOSButton } from '../components/SOSButton';
import { RoomTracker } from '../components/RoomTracker';
import { EntryExitFAB } from '../components/EntryExitFAB';
import { FoodTracker } from '../components/FoodTracker';
import { ParticlesBackground } from '../components/ParticlesBackground';

interface Task {
  id: string; title: string; description: string;
  priority: 'high' | 'medium' | 'low'; status: 'pending' | 'completed';
}

const TASKS: Task[] = [
  { id: '1', title: 'Setup Registration Desk',   description: 'Arrange registration materials and participant badges', priority: 'high',   status: 'completed' },
  { id: '2', title: 'Distribute Food Coupons',   description: 'Hand out lunch coupons to all participants',           priority: 'high',   status: 'pending' },
  { id: '3', title: 'Room Direction Assistance', description: 'Help participants find their assigned rooms',          priority: 'medium', status: 'pending' },
  { id: '4', title: 'Check Audio Equipment',     description: 'Verify all microphones and speakers are working',     priority: 'low',    status: 'pending' },
];

const priorityConfig = {
  high:   { color: '#fff', bg: '#1a1a1a',  border: 'rgba(255,255,255,0.4)',  label: 'HIGH' },
  medium: { color: '#ccc', bg: '#111', border: 'rgba(255,255,255,0.2)', label: 'MED' },
  low:    { color: '#888', bg: '#0a0a0a', border: 'rgba(255,255,255,0.1)', label: 'LOW' },
};

export function VolunteerDashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false });
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) setUserData(JSON.parse(stored));
    else navigate('/');

    const ctx = gsap.context(() => {
      gsap.from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [navigate]);

  const toggleTask = (id: string) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t));
  };

  const completed = tasks.filter(t => t.status === 'completed').length;

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
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/50 mb-2 block">Volunteer Terminal</span>
            <h1 className="text-3xl font-serif leading-tight font-light truncate">
              {userData?.name || 'Volunteer'}
            </h1>
          </div>

          <nav className="stagger-reveal flex flex-col gap-4 mb-12">
            <button onClick={() => navigate('/feedback')}
              className="flex items-center gap-4 px-4 py-3 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-300">
              <MessageCircle className="w-4 h-4 text-white/60" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Provide Feedback</span>
            </button>
          </nav>
        </div>

        <div className="stagger-reveal space-y-4">
          <div className="p-4 border border-white/5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Status</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs">Live</span>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 py-4 border border-white/10 hover:bg-white hover:text-black transition-colors duration-300">
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL - Content Area */}
      <main className="lg:ml-[350px] flex-1 min-h-screen relative z-10 bg-[#050505] p-8 md:p-12 lg:p-16 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <header className="stagger-reveal border-b border-white/10 pb-8">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Operations Dashboard</h2>
            <p className="font-serif text-2xl md:text-3xl font-light text-white/80 max-w-2xl leading-snug">
              Review logistics, manage task queues, and ensure optimal execution.
            </p>
          </header>

          <div className="stagger-reveal grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Tasks */}
              <div className="border border-white/10 p-6 md:p-8 bg-[#0a0a0a]">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-5 h-5 text-white/60" />
                    <h2 className="font-serif text-xl font-light">Assigned Tasks</h2>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold">
                    {completed}/{tasks.length} Completed
                  </div>
                </div>

                <div className="space-y-4">
                  {tasks.map(task => {
                    const pc = priorityConfig[task.priority];
                    return (
                      <div key={task.id} className="border p-6 transition-all duration-300"
                        style={{
                          borderColor: task.status === 'completed' ? 'rgba(255,255,255,0.05)' : pc.border,
                          backgroundColor: task.status === 'completed' ? 'transparent' : pc.bg,
                          opacity: task.status === 'completed' ? 0.6 : 1,
                        }}>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`font-serif text-lg ${task.status === 'completed' ? 'line-through text-white/40' : 'text-white'}`}>
                                {task.title}
                              </h3>
                              <span className="text-[9px] uppercase tracking-widest border border-white/20 px-2 py-0.5 text-white/60">
                                {pc.label}
                              </span>
                            </div>
                            <p className={`text-sm font-light leading-relaxed ${task.status === 'completed' ? 'text-white/25 line-through' : 'text-white/60'}`}>
                              {task.description}
                            </p>
                          </div>
                          
                          <button onClick={() => toggleTask(task.id)}
                            className={`flex items-center justify-center gap-2 px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors border flex-shrink-0
                              ${task.status === 'completed' 
                                ? 'border-white/20 hover:border-white/60 text-white/60' 
                                : 'border-white bg-white text-black hover:bg-transparent hover:text-white'}`}>
                            <CheckCircle className="w-3.5 h-3.5" />
                            {task.status === 'completed' ? 'Revert' : 'Mark Done'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border border-white/10 p-6 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Provisions Tracker</h3>
                <FoodTracker meals={meals} onMealReceived={mt => setMeals({ ...meals, [mt]: true })} />
              </div>
            </div>

            <div className="space-y-8">
              <div className="border border-white/10 p-6 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Location Status</h3>
                <RoomTracker roleLabel="Volunteer" currentRoom={currentRoom} onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)} />
              </div>

              {/* Task Stats */}
              <div className="border border-white/10 p-8 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Task Breakdown
                </h3>
                
                <div className="space-y-4">
                  {[
                    { label: 'Completed', val: tasks.filter(t => t.status === 'completed').length },
                    { label: 'High Priority', val: tasks.filter(t => t.priority === 'high' && t.status === 'pending').length },
                    { label: 'Medium', val: tasks.filter(t => t.priority === 'medium' && t.status === 'pending').length },
                    { label: 'Low', val: tasks.filter(t => t.priority === 'low' && t.status === 'pending').length },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-[10px] uppercase tracking-widest text-white/60">{label}</span>
                      <span className="font-serif text-xl">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SOSButton onSOS={(r, d) => alert(`SOS!\nReason: ${r}\n${d}`)} />
      <EntryExitFAB
        currentRoom={currentRoom}
        onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)}
        roleLabel="Volunteer"
        roleColor="#fff"
      />
    </div>
  );
}
