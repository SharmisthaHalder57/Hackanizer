import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import {
  LogOut, MessageSquare, Check, Clock, MessageCircle, Zap,
  Bell, BellOff, Loader2, AlertCircle, RefreshCw, Sparkles,
  Code2, Activity
} from 'lucide-react';
import { SOSButton } from '../components/SOSButton';
import { RoomTracker } from '../components/RoomTracker';
import { EntryExitFAB } from '../components/EntryExitFAB';
import { FoodTracker } from '../components/FoodTracker';
import { subscribeToMentorQueries } from '../../lib/firebase';
import { queries as queriesApi, type QueryItem } from '../../lib/api';
import { ParticlesBackground } from '../components/ParticlesBackground';

const statusConfig = {
  pending:       { color: '#fff', label: 'Pending',     bg: '#111',  border: 'rgba(255,255,255,0.1)' },
  assigned:      { color: '#ccc', label: 'Assigned',    bg: '#111',   border: 'rgba(255,255,255,0.2)' },
  'in-progress': { color: '#d4af37', label: 'In Progress', bg: '#1a1a1a',  border: 'rgba(212,175,55,0.3)' },
  resolved:      { color: '#666', label: 'Resolved',    bg: '#0a0a0a',  border: 'rgba(255,255,255,0.05)' },
};

async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

function pushNotify(title: string, body: string) {
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'new-query',
    renotify: true,
  });
}

export function MentorDashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false });

  // ── Query state ─────────────────────────────────────────────────────────────
  const [queryList, setQueryList] = useState<QueryItem[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied',
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const prevIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Load user ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) setUserData(JSON.parse(stored));
    else navigate('/');

    const ctx = gsap.context(() => {
      gsap.from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [navigate]);

  // ── Request notification permission on mount ─────────────────────────────────
  useEffect(() => {
    requestNotificationPermission().then(setNotifPermission);
  }, []);

  // ── Firestore real-time subscription ─────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (!stored) return;
    const user = JSON.parse(stored);
    const uid: string = user?.id || user?.firebase_uid;
    if (!uid) return;

    const unsub = subscribeToMentorQueries(uid, (snap) => {
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

      if (isFirstLoad.current) {
        items.forEach(q => prevIds.current.add(q.id));
        isFirstLoad.current = false;
      } else {
        const newOnes = items.filter(q => !prevIds.current.has(q.id));
        if (newOnes.length > 0) {
          newOnes.forEach(q => {
            prevIds.current.add(q.id);
            pushNotify(
              '🆕 New Help Request',
              `${q.participant_name ?? 'A participant'} needs help${q.skill ? ` with ${q.skill}` : ''}: "${q.message.slice(0, 80)}…"`,
            );
          });
          setUnreadCount(prev => prev + newOnes.length);
        }
      }

      setQueryList(items);
      setLoadingQueries(false);
    });

    return () => unsub();
  }, []);

  // ── Status update via REST API ────────────────────────────────────────────────
  const changeStatus = useCallback(async (id: string, status: QueryItem['status']) => {
    setUpdatingId(id);
    setError(null);
    try {
      await queriesApi.updateStatus(id, { status });
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const enableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const resolved    = queryList.filter(q => q.status === 'resolved').length;
  const active      = queryList.filter(q => q.status === 'in-progress').length;
  const pending     = queryList.filter(q => q.status === 'pending' || q.status === 'assigned').length;

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
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/50 mb-2 block">Mentor Terminal</span>
            <h1 className="text-3xl font-serif leading-tight font-light truncate">
              {userData?.name || 'Mentor'}
            </h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-4 border border-white/10 p-2 inline-block">
              Expertise: {userData?.skills || 'Not specified'}
            </p>
          </div>

          <nav className="stagger-reveal flex flex-col gap-4 mb-12">
            <button onClick={() => navigate('/feedback')}
              className="flex items-center gap-4 px-4 py-3 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-300">
              <MessageCircle className="w-4 h-4 text-white/60" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Provide Feedback</span>
            </button>
            
            {notifPermission !== 'granted' ? (
              <button onClick={enableNotifications}
                className="flex items-center gap-4 px-4 py-3 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-300">
                <BellOff className="w-4 h-4 text-white/60" />
                <span className="text-[10px] uppercase tracking-[0.2em]">Enable Alerts</span>
              </button>
            ) : (
              <div className="flex items-center gap-4 px-4 py-3 border border-white/5 opacity-50">
                <Bell className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-[0.2em]">Alerts Active</span>
              </div>
            )}
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
          
          <header className="stagger-reveal border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Command Center</h2>
              <p className="font-serif text-2xl md:text-3xl font-light text-white/80 max-w-2xl leading-snug">
                Cultivate visionary talent and resolve inquiries from the floor.
              </p>
            </div>
            {unreadCount > 0 && (
              <button onClick={() => setUnreadCount(0)} className="flex items-center gap-2 px-4 py-2 border border-white bg-white text-black text-[9px] uppercase tracking-widest font-bold">
                <Bell className="w-3 h-3" />
                {unreadCount} New Quer{unreadCount === 1 ? 'y' : 'ies'} - Dismiss
              </button>
            )}
          </header>

          {error && (
            <div className="stagger-reveal mb-6 flex items-center gap-3 p-4 border border-[#B76E79]/30 bg-[#B76E79]/5">
              <AlertCircle className="w-4 h-4 text-[#B76E79]" /> 
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#B76E79]">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">✕</button>
            </div>
          )}

          <div className="stagger-reveal grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Queries Section */}
              <div className="border border-white/10 p-6 md:p-8 bg-[#0a0a0a]">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                  <MessageSquare className="w-5 h-5 text-white/60" />
                  <h3 className="font-serif text-xl font-light">Participant Queries</h3>
                </div>

                {loadingQueries ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-white/30">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Synchronizing data...</span>
                  </div>
                ) : queryList.length === 0 ? (
                  <div className="text-center py-16">
                    <Zap className="w-6 h-6 text-white/20 mx-auto mb-4" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">No queries currently assigned.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queryList.map(query => {
                      const sc = statusConfig[query.status as keyof typeof statusConfig] ?? statusConfig.pending;
                      const ts = new Date(query.created_at);
                      return (
                        <div key={query.id} className="border p-6 transition-colors bg-[#050505]" style={{ borderColor: sc.border }}>
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-serif text-lg">{query.participant_name ?? 'Participant'}</span>
                                <span className="text-[9px] uppercase tracking-[0.2em] border border-white/20 px-2 py-0.5 text-white/60">
                                  {query.target_type}
                                </span>
                              </div>
                              {query.skill && (
                                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Topic: {query.skill}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 border px-3 py-1" style={{ borderColor: sc.border }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                              <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: sc.color }}>{sc.label}</span>
                            </div>
                          </div>

                          <p className="text-sm font-light text-white/70 leading-relaxed mb-6 border-l-2 border-white/10 pl-4">
                            {query.message}
                          </p>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5 text-[10px] uppercase tracking-wider text-white/40">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> {ts.toLocaleString()}
                            </span>
                            
                            {query.status !== 'resolved' && (
                              <div className="flex gap-2">
                                {(query.status === 'pending' || query.status === 'assigned') && (
                                  <button
                                    onClick={() => changeStatus(query.id, 'in-progress')}
                                    disabled={updatingId === query.id}
                                    className="px-4 py-2 font-bold border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 flex items-center gap-2 text-white">
                                    {updatingId === query.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                    Commence
                                  </button>
                                )}
                                <button
                                  onClick={() => changeStatus(query.id, 'resolved')}
                                  disabled={updatingId === query.id}
                                  className="px-4 py-2 font-bold border border-white/40 hover:border-white transition-colors disabled:opacity-50 flex items-center gap-2">
                                  {updatingId === query.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Resolve
                                </button>
                              </div>
                            )}
                            {query.status === 'resolved' && (
                              <span className="flex items-center gap-1.5 text-white/60">
                                <Sparkles className="w-3 h-3" /> Resolved
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border border-white/10 p-6 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Provisions Tracker</h3>
                <FoodTracker meals={meals} onMealReceived={mt => setMeals({ ...meals, [mt]: true })} />
              </div>
            </div>

            <div className="space-y-8">
              <div className="border border-white/10 p-6 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Location Status</h3>
                <RoomTracker roleLabel="Mentor" currentRoom={currentRoom} onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)} />
              </div>

              {/* Impact Card */}
              <div className="border border-white/10 p-8 bg-[#0a0a0a]">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> System Impact
                </h3>

                <div className="mb-8">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-serif text-3xl font-light">{resolved}</span>
                    <span className="text-[9px] uppercase tracking-widest text-white/40 mb-1">/ {queryList.length || 0} Resolved</span>
                  </div>
                  <div className="h-1 bg-white/5 relative">
                    <div className="absolute top-0 left-0 h-full bg-white transition-all duration-700"
                      style={{ width: `${queryList.length ? (resolved / queryList.length) * 100 : 0}%` }} />
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Pending / Assigned', val: pending },
                    { label: 'In Progress', val: active },
                    { label: 'Resolved', val: resolved },
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

      <SOSButton onSOS={(r, d) => alert(`SOS!\nReason: ${r}\nDetails: ${d}`)} />
      <EntryExitFAB
        currentRoom={currentRoom}
        onRoomChange={(r, a) => setCurrentRoom(a === 'enter' ? r : null)}
        roleLabel="Mentor"
        roleColor="#fff"
      />
    </div>
  );
}
