import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Code2, Loader2, Play, X, ChevronRight, Sparkles, Zap, Trophy, Target } from 'lucide-react';
import { auth, setToken } from '../../lib/api';
import { signInWithGoogle } from '../../lib/firebase';
import { ParticlesBackground } from '../components/ParticlesBackground';

gsap.registerPlugin(ScrollTrigger);

interface LoginFormData {
  name: string;
  email: string;
  userType: 'participant' | 'mentor' | 'judge' | 'volunteer' | 'organizer';
  skills?: string;
}

const roles = [
  {
    id: '01',
    type: 'participant' as const,
    label: 'Hacker',
    desc: 'Architect the impossible. Turn radical ideas into working prototypes in 48 hours.',
    image: 'https://images.unsplash.com/photo-1550439062-609e1531270e?q=80&w=2000&auto=format&fit=crop',
    accent: '#E5E4E2', // Platinum
  },
  {
    id: '02',
    type: 'mentor' as const,
    label: 'Mentor',
    desc: 'Cultivate visionary talent. Guide the next generation of tech pioneers.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2000&auto=format&fit=crop',
    accent: '#D4AF37', // Gold
  },
  {
    id: '03',
    type: 'judge' as const,
    label: 'Judge',
    desc: 'Evaluate premier innovations. Crown the architects of tomorrow.',
    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop',
    accent: '#B76E79', // Rose Gold
  },
  {
    id: '04',
    type: 'volunteer' as const,
    label: 'Volunteer',
    desc: 'Orchestrate the chaos. Keep the adrenaline pumping and the event running flawlessly.',
    image: 'https://images.unsplash.com/photo-1511649475669-e288648b2339?q=80&w=2000&auto=format&fit=crop',
    accent: '#CD7F32', // Bronze
  },
  {
    id: '05',
    type: 'organizer' as const,
    label: 'Organizer',
    desc: 'Command the ecosystem. Direct the narrative of the grandest hackathon on earth.',
    image: 'https://images.unsplash.com/photo-1492551557933-34265f7af79e?q=80&w=2000&auto=format&fit=crop',
    accent: '#C0C0C0', // Silver
  },
];

export function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginFormData>({ name: '', email: '', userType: 'participant' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const selected = roles.find(r => r.type === form.userType)!;

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Left Panel Entrance
      gsap.from('.stagger-reveal', {
        opacity: 0,
        y: 40,
        duration: 1.8,
        ease: 'power4.out',
        stagger: 0.15,
        delay: 0.2
      });

      // Right Panel elements Entrance
      gsap.from('.scroll-reveal', {
        scrollTrigger: { trigger: '.scroll-container', start: 'top 80%' },
        opacity: 0,
        y: 40,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.15
      });

      gsap.from('.role-row', {
        scrollTrigger: { trigger: '.roles-container', start: 'top 80%' },
        opacity: 0,
        x: 50,
        duration: 1.5,
        ease: 'power3.out',
        stagger: 0.2
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Drawer Animation
  useEffect(() => {
    if (isDrawerOpen) {
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.6, ease: 'power3.out', display: 'block' });
      gsap.fromTo(drawerRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.8, ease: 'expo.out' }
      );
    }
  }, [isDrawerOpen]);

  const openDrawer = (type: typeof form.userType) => {
    setForm(f => ({ ...f, userType: type }));
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: () => {
        if (overlayRef.current) overlayRef.current.style.display = 'none';
      }
    });
    gsap.to(drawerRef.current, {
      x: '100%', duration: 0.6, ease: 'expo.in',
      onComplete: () => setIsDrawerOpen(false)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError(null);

    const routes: Record<string, string> = {
      participant: '/participant', mentor: '/mentor',
      judge: '/judge', volunteer: '/volunteer', organizer: '/organizer',
    };

    const mockToken = `mock-token-${encodeURIComponent(form.email)}-${encodeURIComponent(form.name)}`;

    try {
      const response = await auth.googleLogin({ id_token: mockToken, role: form.userType, skills: form.skills });
      setToken(response.token.access_token);
      localStorage.setItem('userData', JSON.stringify({
        id: response.user.id, name: response.user.full_name, email: response.user.email,
        userType: response.user.role, skills: response.user.skills, photo_url: response.user.photo_url,
      }));
      closeDrawer();
      setTimeout(() => navigate(routes[form.userType]), 500);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setApiError(null);
    const routes: Record<string, string> = {
      participant: '/participant', mentor: '/mentor',
      judge: '/judge', volunteer: '/volunteer', organizer: '/organizer',
    };

    try {
      const credential = await signInWithGoogle();
      const idToken = await credential.user.getIdToken();
      if (!idToken) throw new Error("Failed to retrieve Firebase ID token");

      const response = await auth.googleLogin({ id_token: idToken, role: form.userType, skills: form.skills });
      setToken(response.token.access_token);
      localStorage.setItem('userData', JSON.stringify({
        id: response.user.id, name: response.user.full_name, email: response.user.email,
        userType: response.user.role, skills: response.user.skills, photo_url: response.user.photo_url,
      }));
      closeDrawer();
      setTimeout(() => navigate(routes[form.userType]), 500);
    } catch (err: any) {
      setApiError(err.message || 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black flex flex-col lg:flex-row overflow-hidden">

      {/* Background Noise Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* LEFT PANEL - Fixed Editorial Side */}
      <aside className="lg:w-[45%] lg:h-screen lg:fixed top-0 left-0 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between p-8 md:p-16 relative z-10 bg-[#030303] overflow-hidden">
        
        {/* Particle Network Animation matched to the premium aesthetic */}
        <ParticlesBackground color="#ffffff" className="absolute inset-0 z-0 opacity-40 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/40 via-transparent to-[#030303]/80 z-0 pointer-events-none" />

        {/* Nav / Logo */}
        <div className="stagger-reveal flex items-center justify-between w-full mb-20 lg:mb-0 relative z-10">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-8 h-8 flex items-center justify-center border border-white/20 group-hover:border-white/60 transition-colors duration-500 bg-[#030303]">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-sm md:text-base tracking-[0.25em] uppercase">Hackanizer</span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 bg-[#030303]/80 backdrop-blur-sm px-2 py-1">Est. 2026</div>
        </div>

        {/* Hero Copy */}
        <div className="my-auto relative z-10">
          <div className="stagger-reveal mb-8 inline-block border-b border-white/10 pb-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/50 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> The Premier Collective
            </span>
          </div>

          <h1 className="stagger-reveal text-5xl md:text-7xl lg:text-8xl font-serif leading-[1.05] tracking-tight font-light mb-8 drop-shadow-2xl">
            Ignite <br />
            <span className="italic text-white/60">the next</span> <br />
            frontier.
          </h1>

          <p className="stagger-reveal text-sm md:text-base text-white/60 max-w-md font-light leading-relaxed mb-12 bg-[#030303]/20 p-2 backdrop-blur-sm rounded">
            Welcome to the ultimate convergence of visionary minds. This isn't just an event—it's an intellectual crucible designed for innovators who dare to rewrite the rules and build the impossible in 48 hours.
          </p>

          <div className="stagger-reveal flex gap-6 bg-[#030303]/40 backdrop-blur-md p-6 border border-white/10 inline-flex">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Prize Capital</span>
              <span className="font-serif text-2xl">$500k+</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Innovators</span>
              <span className="font-serif text-2xl">1,200+</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Hours</span>
              <span className="font-serif text-2xl">48</span>
            </div>
          </div>
        </div>

        {/* Footer info (Left Side) */}
        <div className="stagger-reveal hidden lg:flex items-center justify-between mt-20 text-[9px] uppercase tracking-[0.2em] text-white/30 relative z-10">
          <span className="bg-[#030303]/80 backdrop-blur-sm px-2 py-1">Global Operations</span>
          <span className="bg-[#030303]/80 backdrop-blur-sm px-2 py-1">© All Rights Reserved</span>
        </div>
      </aside>

      {/* RIGHT PANEL - Scrollable Canvas */}
      <main className="lg:w-[55%] lg:ml-[45%] min-h-screen relative z-10 flex flex-col bg-[#050505]">

        {/* Info Section 1: The Experience */}
        <div className="scroll-container p-8 md:p-16 lg:p-24 border-b border-white/5">
          <h2 className="scroll-reveal text-xs uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-3">
            <Zap className="w-4 h-4 text-white/60" /> 
            The Experience
          </h2>
          <p className="scroll-reveal font-serif text-2xl md:text-4xl font-light text-white/90 max-w-xl leading-snug mb-8">
            Forty-eight hours of pure adrenaline, relentless coding, and radical creativity.
          </p>
          <p className="scroll-reveal text-white/50 max-w-lg font-light leading-relaxed mb-8">
            Expect gourmet provisions, bottomless caffeine, and unrestricted access to industry-leading mentors. We provide the infrastructure, the hardware, and the atmosphere. You bring the genius. No sleep. All code. Total glory.
          </p>
        </div>

        {/* Info Section 2: Prizes and Glory */}
        <div className="scroll-container p-8 md:p-16 lg:px-24 lg:py-20 border-b border-white/5 bg-[#0a0a0a]">
          <h2 className="scroll-reveal text-xs uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-3">
            <Trophy className="w-4 h-4 text-white/60" /> 
            The Spoils
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="scroll-reveal">
              <h3 className="font-serif text-3xl font-light mb-4">Equity-Free Capital</h3>
              <p className="text-white/50 font-light text-sm leading-relaxed">
                Compete for a share of our $500,000+ prize pool. Transform your weekend prototype into a fully funded startup without giving up a single share.
              </p>
            </div>
            <div className="scroll-reveal">
              <h3 className="font-serif text-3xl font-light mb-4">Venture Backing</h3>
              <p className="text-white/50 font-light text-sm leading-relaxed">
                Pitch directly to partners from top-tier venture firms pacing the floor. Leave the hackathon with a term sheet in hand.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action for Roles */}
        <div className="p-8 md:p-16 lg:px-24 lg:py-20 border-b border-white/5">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 flex items-center gap-3">
            <Target className="w-4 h-4 text-white/60" />
            Select Discipline
          </h2>
          <p className="font-serif text-2xl md:text-3xl font-light text-white/80 max-w-lg leading-snug">
            Choose your theater of operations and unlock access to unparalleled technological frontiers.
          </p>
        </div>

        {/* Roles List */}
        <div className="roles-container flex-1">
          {roles.map((role) => (
            <div
              key={role.type}
              onClick={() => openDrawer(role.type)}
              className="role-row group relative border-b border-white/5 cursor-pointer overflow-hidden"
            >
              {/* Hover Image Background */}
              <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-20 scale-105 group-hover:scale-100 transition-all duration-[1.5s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                <img src={role.image} alt={role.label} className="w-full h-full object-cover grayscale" />
                <div className="absolute inset-0 bg-black/60" />
              </div>

              {/* Content */}
              <div className="relative z-10 p-8 md:p-12 lg:px-24 lg:py-16 flex flex-col md:flex-row md:items-center justify-between gap-8 transition-transform duration-700 group-hover:translate-x-4">

                <div className="flex items-center gap-8 md:gap-16">
                  <span className="font-serif text-2xl md:text-4xl text-white/20 group-hover:text-white transition-colors duration-500">
                    {role.id}
                  </span>
                  <div>
                    <h3 className="font-serif text-3xl md:text-5xl font-light mb-3 group-hover:italic transition-all duration-500">
                      {role.label}
                    </h3>
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40 font-medium max-w-sm leading-relaxed">
                      {role.desc}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex w-12 h-12 rounded-full border border-white/10 items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
                  <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Footer */}
        <div className="lg:hidden p-8 text-center text-[9px] uppercase tracking-[0.2em] text-white/30 border-t border-white/5">
          © 2026 Hackanizer. All Rights Reserved.
        </div>
      </main>

      {/* AUTH DRAWER - Ultra Premium */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 hidden"
        onClick={closeDrawer}
      />

      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-[#0a0a0a] border-l border-white/10 z-50 p-8 md:p-12 flex flex-col shadow-2xl overflow-y-auto transform translate-x-full"
      >
        <div className="flex justify-between items-center mb-16">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Authentication Portal</span>
          <button onClick={closeDrawer} className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-16">
          <div className="text-5xl font-serif mb-4" style={{ color: selected.accent }}>
            {roles.find(r => r.type === form.userType)?.id}
          </div>
          <h2 className="font-serif text-4xl mb-3 font-light">
            Enter as <span className="italic">{selected.label}</span>
          </h2>
          <p className="text-sm text-white/40 font-light leading-relaxed">
            Provide your credentials to access the exclusive command center and join the ranks of the elite.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12 flex-1">
          <div className="relative group">
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-transparent border-b border-white/20 pb-4 text-base text-white focus:outline-none focus:border-white transition-colors placeholder:text-transparent peer"
              placeholder="Full Legal Name"
            />
            <label className={`absolute left-0 text-[10px] uppercase tracking-[0.2em] text-white/40 transition-all duration-300 pointer-events-none 
              ${form.name ? '-top-5 text-white/70' : 'top-0 peer-focus:-top-5 peer-focus:text-white/70'}`}>
              Full Legal Name
            </label>
          </div>

          <div className="relative group">
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-transparent border-b border-white/20 pb-4 text-base text-white focus:outline-none focus:border-white transition-colors placeholder:text-transparent peer"
              placeholder="Professional Email"
            />
            <label className={`absolute left-0 text-[10px] uppercase tracking-[0.2em] text-white/40 transition-all duration-300 pointer-events-none 
              ${form.email ? '-top-5 text-white/70' : 'top-0 peer-focus:-top-5 peer-focus:text-white/70'}`}>
              Professional Email
            </label>
          </div>

          {form.userType === 'mentor' && (
            <div className="relative group">
               <input
                type="text"
                required
                value={form.skills || ''}
                onChange={e => setForm({ ...form, skills: e.target.value })}
                className="w-full bg-transparent border-b border-white/20 pb-4 text-base text-white focus:outline-none focus:border-white transition-colors placeholder:text-transparent peer"
                placeholder="Primary Expertise"
              />
              <label className={`absolute left-0 text-[10px] uppercase tracking-[0.2em] text-white/40 transition-all duration-300 pointer-events-none 
                ${form.skills ? '-top-5 text-white/70' : 'top-0 peer-focus:-top-5 peer-focus:text-white/70'}`}>
                Primary Expertise
              </label>
            </div>
          )}

          {apiError && (
            <div className="text-[11px] tracking-wide text-[#B76E79] bg-[#B76E79]/10 p-4 border-l-2 border-[#B76E79]">
              {apiError}
            </div>
          )}

          <div className="pt-8 space-y-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 text-[10px] uppercase tracking-[0.25em] font-bold transition-all duration-500 disabled:opacity-50 relative overflow-hidden group border border-white/20"
            >
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
              <span className="relative z-10 flex items-center justify-center gap-3 group-hover:text-black transition-colors duration-500">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authenticate System'}
              </span>
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/30">Alternative</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-5 bg-[#111] text-white text-[10px] uppercase tracking-[0.25em] flex items-center justify-center gap-4 hover:bg-[#1a1a1a] transition-colors duration-300 border border-white/5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#fff" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
              </svg>
              Sign In with Google
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}