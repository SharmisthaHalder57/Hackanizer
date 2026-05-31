import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { ArrowLeft, Send, CheckCircle, Shield } from 'lucide-react';
import { ParticlesBackground } from '../components/ParticlesBackground';
import { api, getHackathonId } from '../../lib/api';

const categories = [
  { id:'event',       name:'Overall Event' },
  { id:'mentors',     name:'Mentors' },
  { id:'judges',      name:'Judges' },
  { id:'volunteers',  name:'Volunteers' },
  { id:'food',        name:'Food & Beverages' },
  { id:'venue',       name:'Venue & Facilities' },
];

const quickTags: Record<string, string[]> = {
  event:      ['Well organized','Great energy','Smooth experience','Too long','Needs improvement'],
  mentors:    ['Very helpful','Expert knowledge','Approachable','Not available','Excellent guidance'],
  judges:     ['Fair evaluation','Clear criteria','Constructive feedback','Biased','Professional'],
  volunteers: ['Friendly','Very responsive','Hard to find','Well coordinated','Helpful'],
  food:       ['Delicious','Healthy options','Late delivery','Good variety','Not enough'],
  venue:      ['Spacious','Good Wi-Fi','Clean','Needs more power outlets','Great ambience'],
};

export function AnonymousFeedback() {
  const navigate = useNavigate();
  const [category, setCategory]     = useState('event');
  const [rating, setRating]         = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback]     = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted]   = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const successRef   = useRef<HTMLDivElement>(null);
  const formRef      = useRef<HTMLDivElement>(null);

  const activeRating = hoverRating || rating;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline()
        .from('.stagger-reveal', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (submitted && successRef.current) {
      gsap.fromTo(successRef.current,
        { scale:0.95, opacity:0, y:10 },
        { scale:1, opacity:1, y:0, duration:0.6, ease:'power3.out' }
      );
    }
  }, [submitted]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    // Submit to real API if hackathon_id is available
    const hackathonId = getHackathonId();
    if (hackathonId) {
      try {
        await api.post(`/feedback?hackathon_id=${encodeURIComponent(hackathonId)}`, {
          category,
          rating,
          tags: selectedTags.length > 0 ? selectedTags : null,
          comment: feedback || null,
        });
      } catch {
        // Silently degrade — feedback should never block the user
      }
    }

    if (formRef.current) {
      gsap.to(formRef.current, { opacity:0, y:-10, duration:0.35, ease:'power2.in', onComplete: () => setSubmitted(true) });
    }
    setTimeout(() => {
      setSubmitted(false); setRating(0); setFeedback(''); setCategory('event'); setSelectedTags([]);
      gsap.fromTo(formRef.current, { opacity:0, y:10 }, { opacity:1, y:0, duration:0.5 });
    }, 4000);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030303] text-white font-sans selection:bg-white selection:text-black flex flex-col items-center py-16 px-8 relative overflow-hidden">
      {/* Background Noise Texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="stagger-reveal mb-12">
          <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Return
          </button>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Secure & Anonymous Channel</span>
          </div>
      <ParticlesBackground color="#ffffff" className="fixed inset-0 z-0 opacity-20 mix-blend-screen" />
      <div className="fixed inset-0 bg-gradient-to-b from-[#030303]/40 via-transparent to-[#030303]/80 z-0 pointer-events-none" />
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
            Submit Feedback
          </h1>
          <p className="text-white/60 font-light max-w-lg leading-relaxed">
            Your honest input helps shape future iterations of the collective. No personal data is attached to this submission.
          </p>
        </div>

        {/* Category Selector */}
        <div className="stagger-reveal grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setSelectedTags([]); }}
              className={`p-4 border transition-all duration-300 text-left
                ${category === cat.id 
                  ? 'border-white bg-white text-black' 
                  : 'border-white/10 hover:border-white/40 text-white/60 hover:bg-white/5'}`}>
              <div className={`text-[10px] uppercase tracking-[0.2em] font-bold ${category === cat.id ? 'text-black' : 'text-white'}`}>
                {cat.name}
              </div>
            </button>
          ))}
        </div>

        {!submitted ? (
          <div ref={formRef} className="stagger-reveal border border-white/10 p-8 md:p-12 bg-[#0a0a0a]">
            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Scale Rating */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Evaluation Scale (1-5)</label>
                <div className="flex gap-4">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className={`flex-1 h-16 border transition-all duration-300 flex items-center justify-center font-serif text-2xl
                        ${star <= activeRating 
                          ? 'border-white bg-white text-black' 
                          : 'border-white/20 text-white/40 hover:border-white/60'}`}>
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tags */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Attributes</label>
                <div className="flex flex-wrap gap-3">
                  {(quickTags[category] || []).map(tag => (
                    <button key={tag} type="button" onClick={() => handleTagToggle(tag)}
                      className={`py-3 px-4 border text-[10px] uppercase tracking-[0.1em] transition-all duration-300
                        ${selectedTags.includes(tag) 
                          ? 'border-white bg-white text-black' 
                          : 'border-white/10 text-white/60 hover:border-white/40'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text feedback */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Detailed Comments</label>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                  className="w-full bg-transparent border-b border-white/20 pb-4 text-base font-light text-white focus:outline-none focus:border-white transition-colors resize-none placeholder:text-white/20" 
                  rows={4}
                  placeholder="Elaborate on your experience..." />
              </div>

              {/* Privacy */}
              <div className="flex items-start gap-4 p-6 border border-white/10 bg-[#050505]">
                <Shield className="w-5 h-5 text-white/40 flex-shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Guaranteed Anonymity</p>
                  <p className="text-xs font-light text-white/40">No identifiers are transmitted or stored with this feedback.</p>
                </div>
              </div>

              <button type="submit" disabled={rating === 0}
                className="w-full py-5 border border-white bg-white text-black text-[10px] uppercase tracking-[0.2em] font-bold transition-all hover:bg-transparent hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3">
                <Send className="w-4 h-4" />
                Transmit Feedback
              </button>
            </form>
          </div>
        ) : (
          <div ref={successRef} className="border border-white/10 p-16 text-center bg-[#0a0a0a]">
            <CheckCircle className="w-12 h-12 text-white mx-auto mb-6" />
            <h2 className="text-3xl font-serif font-light mb-4">Transmission Successful</h2>
            <p className="text-white/60 font-light mb-8 max-w-sm mx-auto">Your insights have been recorded anonymously and will inform future enhancements.</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Refreshing interface...</p>
          </div>
        )}
      </div>
    </div>
  );
}
