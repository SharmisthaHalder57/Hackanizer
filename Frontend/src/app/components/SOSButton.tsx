import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, Send, Siren } from 'lucide-react';
import gsap from 'gsap';

interface SOSButtonProps {
  onSOS: (reason: string, details: string) => void;
}

const emergencyTypes = [
  { value: 'health', label: '🏥 Health Emergency', color: '#ef4444' },
  { value: 'ragging', label: '🚨 Ragging / Harassment', color: '#f97316' },
  { value: 'direction', label: '🗺️ Need Directions', color: '#06b6d4' },
  { value: 'other', label: '⚠️ Other Emergency', color: '#a855f7' },
];

export function SOSButton({ onSOS }: SOSButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('health');
  const [details, setDetails] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showModal && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.85, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, [showModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        scale: 0.9, opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: () => {
          onSOS(reason, details);
          setShowModal(false);
          setDetails('');
        }
      });
    }
  };

  const selectedType = emergencyTypes.find(t => t.value === reason)!;

  return (
    <>
      {/* SOS Floating Button */}
      <button
        ref={btnRef}
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-6 py-4 rounded-full font-black text-white tracking-widest text-sm font-orbitron animate-sos-ring transition-transform hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          boxShadow: '0 0 30px rgba(239,68,68,0.5), 0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <Siren className="w-5 h-5 animate-bounce" />
        SOS
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div ref={modalRef} className="max-w-md w-full" style={{
            background: 'rgba(15, 5, 20, 0.95)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: '1.5rem',
            boxShadow: '0 0 50px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            padding: '2rem',
          }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-sos-ring"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)' }}>
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-orbitron tracking-wide">EMERGENCY</h2>
                  <p className="text-red-400 text-xs font-semibold">Organizers will be notified instantly</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Emergency type */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Emergency Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {emergencyTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setReason(type.value)}
                      className="p-3 rounded-full text-sm font-semibold text-center transition-all"
                      style={{
                        background: reason === type.value ? `${type.color}20` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${reason === type.value ? type.color + '80' : 'rgba(255,255,255,0.08)'}`,
                        color: reason === type.value ? type.color : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Describe the Emergency</label>
                <textarea
                  required value={details}
                  onChange={e => setDetails(e.target.value)}
                  className="dark-input min-h-24 resize-none text-sm"
                  placeholder="Location, what happened, additional info..."
                  style={{ borderColor: 'rgba(239,68,68,0.3)' }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-glass flex-1 py-3 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${selectedType.color}, ${selectedType.color}cc)`,
                    boxShadow: `0 8px 25px ${selectedType.color}40`,
                  }}
                >
                  <Send className="w-4 h-4" />
                  Send Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
