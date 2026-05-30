import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { LogOut, Trophy, Star, MessageCircle, X, Zap, Code2 } from 'lucide-react';
import { SOSButton } from '../components/SOSButton';
import { RoomTracker } from '../components/RoomTracker';
import { EntryExitFAB } from '../components/EntryExitFAB';
import { FoodTracker } from '../components/FoodTracker';
import { ParticlesBackground } from '../components/ParticlesBackground';

interface Project {
  id: string; team: string; title: string; description: string;
  status: 'pending' | 'evaluated'; score?: number;
}

const PROJECTS: Project[] = [
  { id: '1', team: 'Team Alpha', title: 'AI-Powered Code Review Tool',   description: 'Automated code review using machine learning',  status: 'pending' },
  { id: '2', team: 'Team Beta',  title: 'Smart Inventory Management',     description: 'IoT-based warehouse management system',          status: 'evaluated', score: 85 },
  { id: '3', team: 'Team Gamma', title: 'HealthTrack Mobile App',         description: 'Personal health monitoring application',         status: 'pending' },
];

const scoreColor = (s: number) => s >= 80 ? '#fff' : s >= 60 ? '#ccc' : '#888';

export function JudgeDashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false });
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [score, setScore] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) setUserData(JSON.parse(stored));
    else navigate('/');

    const ctx = gsap.context(() => {
      gsap.from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [navigate]);

  useEffect(() => {
    if (showEvalModal && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.95, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
      );
    }
  }, [showEvalModal]);

  const handleEvaluate = (project: Project) => {
    setSelectedProject(project);
    setScore(project.score || 0);
    setShowEvalModal(true);
  };

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProject) {
      setProjects(ps => ps.map(p => p.id === selectedProject.id ? { ...p, status: 'evaluated', score } : p));
      setShowEvalModal(false);
    }
  };

  const evaluated = projects.filter(p => p.status === 'evaluated').length;

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
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/50 mb-2 block">Evaluation Panel</span>
            <h1 className="text-3xl font-serif leading-tight font-light truncate">
              {userData?.name || 'Judge'}
            </h1>
          </div>

          <nav className="stagger-reveal flex flex-col gap-4 mb-12">
            <button onClick={() => navigate('/feedback')}
              className="flex items-center gap-4 px-4 py-3 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-300">
              <MessageCircle className="w-4 h-4 text-white/60" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Feedback</span>
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
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Evaluation Dashboard</h2>
            <p className="font-serif text-2xl md:text-3xl font-light text-white/80 max-w-2xl leading-snug">
              Evaluate premier innovations and crown excellence.
            </p>
          </header>

          <div className="stagger-reveal grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Projects */}
              <div className="border border-white/10 p-6 md:p-8 bg-[#0a0a0a]">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                  <Trophy className="w-5 h-5 text-white/60" />
                  <h3 className="font-serif text-xl font-light">Projects to Evaluate</h3>
                </div>
                
                <div className="space-y-4">
                  {projects.map(project => (
                    <div key={project.id} className="border border-white/10 p-6 hover:border-white/30 transition-colors bg-[#0a0a0a]">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-serif text-xl mb-2">{project.title}</h3>
                          <span className="text-[9px] uppercase tracking-widest border border-white/20 px-2 py-0.5 text-white/60">
                            {project.team}
                          </span>
                        </div>
                        {project.status === 'evaluated' && project.score != null && (
                          <div className="flex flex-col items-center justify-center border border-white/20 p-3 min-w-[4rem]">
                            <Star className="w-3 h-3 mb-1 text-white/60" />
                            <span className="text-xl font-light">{project.score}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-light text-white/70 mb-6">{project.description}</p>
                      
                      <button onClick={() => handleEvaluate(project)}
                        className={`w-full flex items-center justify-center gap-2 py-3 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors border
                          ${project.status === 'evaluated' 
                            ? 'border-white/20 hover:border-white/60 text-white' 
                            : 'border-white bg-white text-black hover:bg-transparent hover:text-white'}`}>
                        <Zap className="w-3 h-3" />
                        {project.status === 'evaluated' ? 'Re-evaluate' : 'Evaluate Project'}
                      </button>
                    </div>
                  ))}
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
                <RoomTracker roleLabel="Judge" currentRoom={currentRoom} onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)} />
              </div>

              {/* Evaluation Progress */}
              <div className="border border-white/10 p-8 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-8">Evaluation Progress</h3>
                
                <div className="text-center mb-6">
                  <div className="font-serif text-5xl font-light mb-2">
                    {evaluated}<span className="text-2xl text-white/40">/{projects.length}</span>
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">Projects Evaluated</div>
                </div>
                
                <div className="h-1 bg-white/10 relative mb-4">
                  <div className="absolute top-0 left-0 h-full bg-white transition-all duration-700"
                    style={{ width: `${(evaluated / projects.length) * 100}%` }} />
                </div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 text-center">
                  {projects.length - evaluated} pending evaluations
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SOSButton onSOS={(r, d) => alert(`SOS!\nReason: ${r}\n${d}`)} />
      <EntryExitFAB
        currentRoom={currentRoom}
        onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)}
        roleLabel="Judge"
        roleColor="#fff"
      />

      {/* Eval Modal */}
      {showEvalModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div ref={modalRef} className="max-w-md w-full bg-[#0a0a0a] border border-white/10 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <div>
                <h2 className="font-serif text-2xl font-light text-white mb-1">Evaluate Project</h2>
                <p className="text-[10px] uppercase tracking-widest text-white/40">{selectedProject.team}</p>
              </div>
              <button onClick={() => setShowEvalModal(false)} className="w-8 h-8 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-white/10 p-5 mb-8">
              <h3 className="font-serif text-lg mb-2">{selectedProject.title}</h3>
              <p className="text-sm font-light text-white/60">{selectedProject.description}</p>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-8">
              <div className="text-center">
                <div className="font-serif text-6xl font-light mb-3">
                  {score}
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/40">Score / 100</div>
              </div>

              <div>
                <input type="range" min="0" max="100" value={score}
                  onChange={e => setScore(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/20 appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #fff 0%, #fff ${score}%, rgba(255,255,255,0.1) ${score}%, rgba(255,255,255,0.1) 100%)`,
                  }} />
                <div className="flex justify-between text-[10px] text-white/40 mt-3 font-serif">
                  <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowEvalModal(false)} 
                  className="flex-1 py-4 text-[10px] uppercase tracking-[0.2em] border border-white/10 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" 
                  className="flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-bold border border-white hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2">
                  Submit Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
