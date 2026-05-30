import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import {
  LogOut, MessageSquare, Send, Sparkles, Map as MapIcon, BarChart3, MessageCircle,
  X, Zap, Clock, Bell, Activity, Hash, Loader2, AlertCircle, CheckCircle2,
  Code2
} from 'lucide-react';
import { SOSButton } from '../components/SOSButton';
import { RoomTracker } from '../components/RoomTracker';
import { EntryExitFAB } from '../components/EntryExitFAB';
import { FoodTracker } from '../components/FoodTracker';
import { subscribeToParticipantQueries } from '../../lib/firebase';
import { queries as queriesApi, type QueryItem, type TargetType } from '../../lib/api';
import { ParticlesBackground } from '../components/ParticlesBackground';

const statusConfig = {
  pending:     { bg: '#111', text: '#fff', border: 'rgba(255,255,255,0.1)', dot: '#fff', label: 'Pending' },
  assigned:    { bg: '#1a1a1a',  text: '#d4af37', border: 'rgba(212,175,55,0.2)',  dot: '#d4af37', label: 'Assigned' },
  'in-progress': { bg: '#1a1a1a', text: '#c0c0c0', border: 'rgba(192,192,192,0.2)', dot: '#c0c0c0', label: 'In Progress' },
  resolved:    { bg: '#111',  text: '#888', border: 'rgba(255,255,255,0.05)',  dot: '#555', label: 'Resolved' },
};

export function ParticipantDashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false });

  // ── Query state ─────────────────────────────────────────────────────────────
  const [queryList, setQueryList] = useState<QueryItem[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Submission form
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newQuery, setNewQuery] = useState({ message: '', targetType: 'mentor' as TargetType, skill: '' });

  // Activity feed
  const [activityFeed, setActivityFeed] = useState<Array<{ text: string; time: string; color: string }>>([]);
  const prevQueryMap = useRef<Map<string, string>>(new window.Map());

  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef    = useRef<HTMLDivElement>(null);

  // ── Load user from localStorage ─────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) setUserData(JSON.parse(stored));
    else navigate('/');

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [navigate]);

  // ── Firestore real-time subscription for participant's queries ───────────────
  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (!stored) return;
    const user = JSON.parse(stored);
    const uid: string = user?.id || user?.firebase_uid;
    if (!uid) return;

    const unsub = subscribeToParticipantQueries(uid, (snap) => {
      const items: QueryItem[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          participant_id:   data.participant_id,
          target_type:      data.target_type,
          skill:            data.skill ?? null,
          message:          data.message,
          status:           data.status,
          assigned_to_id:   data.assigned_to_id ?? null,
          created_at:       data.created_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          participant_name: data.participant_name ?? null,
          assigned_to_name: data.assigned_to_name ?? null,
        };
      });

      const newEvents: Array<{ text: string; time: string; color: string }> = [];
      items.forEach(q => {
        const prev = prevQueryMap.current.get(q.id);
        if (prev && prev !== q.status) {
          const color = statusConfig[q.status as keyof typeof statusConfig]?.dot ?? '#fff';
          newEvents.push({
            text: `Your query status changed to "${q.status}"${q.assigned_to_name ? ` — assigned to ${q.assigned_to_name}` : ''}`,
            time: 'just now',
            color,
          });
        }
        prevQueryMap.current.set(q.id, q.status);
      });

      if (newEvents.length > 0) {
        setActivityFeed(prev => [...newEvents, ...prev].slice(0, 6));
      }

      setQueryList(items);
      setLoadingQueries(false);
    });

    return () => unsub();
  }, []);

  // ── Modal animation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (showQueryModal && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.95, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' },
      );
    }
  }, [showQueryModal]);

  // ── Submit new query via REST API ────────────────────────────────────────────
  const handleSubmitQuery = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.message.trim()) return;
    setSubmitting(true);
    setQueryError(null);
    try {
      await queriesApi.create({
        target_type: newQuery.targetType,
        skill: newQuery.skill || undefined,
        message: newQuery.message,
      });
      setShowQueryModal(false);
      setNewQuery({ message: '', targetType: 'mentor', skill: '' });
    } catch (err: any) {
      setQueryError(err.message || 'Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  }, [newQuery]);

  const mealCount = Object.values(meals).filter(Boolean).length;
  const activeQueries = queryList.filter(q => q.status !== 'resolved').length;

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black flex flex-col lg:flex-row overflow-hidden relative">
      {/* Background Noise Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* LEFT PANEL - Navigation / Overview */}
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
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/50 mb-2 block">Participant</span>
            <h1 className="text-3xl font-serif leading-tight font-light truncate">
              {userData?.name || 'Hacker'}
            </h1>
          </div>

          <nav className="stagger-reveal flex flex-col gap-4 mb-12">
            {[
              { label: 'Heatmap', icon: MapIcon, path: '/heatmap' },
              { label: 'Feedback', icon: MessageCircle, path: '/feedback' },
              { label: 'Reports', icon: BarChart3, path: '/reports' },
            ].map(({ label, icon: Icon, path }) => (
              <button key={path} onClick={() => navigate(path)}
                className="flex items-center gap-4 px-4 py-3 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-300">
                <Icon className="w-4 h-4 text-white/60" />
                <span className="text-[10px] uppercase tracking-[0.2em]">{label}</span>
              </button>
            ))}
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
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 py-4 border border-white/10 hover:bg-white hover:text-black transition-colors duration-300 group">
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL - Content Area */}
      <main className="lg:ml-[350px] flex-1 min-h-screen relative z-10 bg-[#050505] p-8 md:p-12 lg:p-16 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <header className="stagger-reveal border-b border-white/10 pb-8">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Command Center</h2>
            <p className="font-serif text-2xl md:text-3xl font-light text-white/80 max-w-2xl leading-snug">
              Monitor your event progress, request assistance, and manage your track directly from this terminal.
            </p>
          </header>

          {/* Stats Overview */}
          <div className="stagger-reveal grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Queries', val: activeQueries, suffix: '' },
              { label: 'Meals', val: mealCount, suffix: '/3' },
              { label: 'Rooms Today', val: 3, suffix: '' },
              { label: 'Event Progress', val: 68, suffix: '%' },
            ].map(({ label, val, suffix }) => (
              <div key={label} className="p-6 border border-white/10 hover:border-white/30 transition-colors duration-500 bg-[#0a0a0a]">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-4">{label}</div>
                <div className="font-serif text-3xl font-light">
                  {val}<span className="text-white/40 text-lg">{suffix}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="stagger-reveal grid lg:grid-cols-3 gap-8">
            {/* Left Column - Queries */}
            <div className="lg:col-span-2 space-y-8">
              {/* Queries Section */}
              <div className="border border-white/10 p-6 md:p-8 bg-[#0a0a0a]">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-white/60" />
                    <h3 className="font-serif text-xl font-light">Active Queries</h3>
                    {queryList.length > 0 && (
                      <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 px-2 py-0.5 ml-2">
                        {queryList.length} Total
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowQueryModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 border border-white/20 hover:bg-white hover:text-black transition-colors duration-300">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Request Help</span>
                  </button>
                </div>

                {loadingQueries ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-white/30">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Authenticating stream...</span>
                  </div>
                ) : queryList.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare className="w-6 h-6 text-white/20 mx-auto mb-4" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">No active queries. System is optimal.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queryList.map(q => {
                      const sc = statusConfig[q.status as keyof typeof statusConfig] ?? statusConfig.pending;
                      const ts = new Date(q.created_at);
                      return (
                        <div key={q.id} className="border p-5 transition-colors duration-300"
                          style={{ background: sc.bg, borderColor: sc.border }}>
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="text-[9px] uppercase tracking-[0.2em] border border-white/10 px-2 py-1">
                              {q.target_type}
                            </span>
                            {q.skill && (
                              <span className="text-[9px] uppercase tracking-[0.2em] border border-white/10 px-2 py-1 text-white/60">
                                {q.skill}
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-2 border px-2 py-1" style={{ borderColor: sc.border }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                              <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: sc.text }}>{sc.label}</span>
                            </div>
                          </div>
                          <p className="text-sm text-white/70 font-light leading-relaxed mb-3">{q.message}</p>
                          
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40 border-t border-white/5 pt-3">
                            <div className="flex items-center gap-2">
                              {q.assigned_to_name && (
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3" /> {q.assigned_to_name}
                                </span>
                              )}
                              {q.status === 'resolved' && (
                                <span className="flex items-center gap-1.5 text-white/60">
                                  <CheckCircle2 className="w-3 h-3" /> Resolved
                                </span>
                              )}
                            </div>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> {ts.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Food Tracker component might need separate redesign later, but we use it as is for now */}
              <div className="border border-white/10 p-6 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Provisions Tracker</h3>
                <FoodTracker meals={meals} onMealReceived={mt => setMeals({ ...meals, [mt]: true })} />
              </div>
            </div>

            {/* Right Column - Status & Room */}
            <div className="space-y-8">
              <div className="border border-white/10 p-6 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Location Status</h3>
                <RoomTracker currentRoom={currentRoom} onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)} roleLabel="Participant" />
              </div>

              {/* Activity Feed */}
              <div className="border border-white/10 p-6 bg-[#0a0a0a]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Activity Log
                  </h3>
                  <span className="text-[8px] uppercase tracking-[0.2em] text-white/20">Live</span>
                </div>
                
                {activityFeed.length === 0 ? (
                  <div className="space-y-4">
                    {['Awaiting mentor response...', 'Request assistance when needed', 'Claim provisions at designated times'].map((text, i) => (
                      <div key={i} className="flex gap-4 items-start opacity-30">
                        <div className="w-6 h-6 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-3 h-3 text-white/50" />
                        </div>
                        <p className="text-xs font-light leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityFeed.map(({ text, time, color }, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="w-6 h-6 border border-white/10 flex items-center justify-center flex-shrink-0" style={{ borderColor: color }}>
                          <Bell className="w-3 h-3" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-xs font-light text-white/70 leading-relaxed mb-1">{text}</p>
                          <p className="text-[9px] uppercase tracking-wider text-white/30">{time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SOSButton onSOS={(r, d) => alert(`SOS!\nReason: ${r}\nDetails: ${d}`)} />
      <EntryExitFAB
        currentRoom={currentRoom}
        onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)}
        roleLabel="Participant"
        roleColor="#fff"
      />

      {/* ── Query Submit Modal ── */}
      {showQueryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div ref={modalRef} className="max-w-lg w-full bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h2 className="font-serif text-2xl font-light text-white flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-white/40" /> Request Intel
                </h2>
                <button onClick={() => setShowQueryModal(false)} className="w-8 h-8 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {queryError && (
                <div className="mb-6 flex items-center gap-3 p-4 border border-[#B76E79]/30 bg-[#B76E79]/5">
                  <AlertCircle className="w-4 h-4 text-[#B76E79]" /> 
                  <span className="text-[10px] uppercase tracking-[0.1em] text-[#B76E79]">{queryError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitQuery} className="space-y-8">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Target Personnel</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['mentor', 'judge', 'volunteer'] as const).map(type => (
                      <button key={type} type="button"
                        onClick={() => setNewQuery({ ...newQuery, targetType: type })}
                        className={`py-3 text-[10px] uppercase tracking-[0.2em] border transition-colors duration-300
                          ${newQuery.targetType === type ? 'border-white bg-white text-black' : 'border-white/10 text-white/40 hover:border-white/40'}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {newQuery.targetType === 'mentor' && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Subject Matter</label>
                    <input type="text" value={newQuery.skill}
                      onChange={e => setNewQuery({ ...newQuery, skill: e.target.value })}
                      className="w-full bg-transparent border-b border-white/20 pb-3 text-sm text-white focus:outline-none focus:border-white transition-colors" 
                      placeholder="e.g. React, Python, Architecture" />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Query Details</label>
                  <textarea required value={newQuery.message}
                    onChange={e => setNewQuery({ ...newQuery, message: e.target.value })}
                    className="w-full bg-transparent border-b border-white/20 pb-3 text-sm text-white focus:outline-none focus:border-white transition-colors resize-none" 
                    rows={4} placeholder="Describe your required assistance..." />
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowQueryModal(false)} 
                    className="flex-1 py-4 text-[10px] uppercase tracking-[0.2em] border border-white/10 hover:bg-white/5 transition-colors">
                    Abort
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-4 text-[10px] uppercase tracking-[0.2em] font-bold border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Transmit</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
