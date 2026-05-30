import { useState, useEffect, useRef } from 'react';
import { DoorOpen, MapPin, X, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';

interface RoomTrackerProps {
  currentRoom: string | null;
  onRoomChange: (room: string, action: 'enter' | 'exit') => void;
  roleLabel?: string;
}

const rooms = ['101', '102', '103', '104', '105', '201', '202', '203', 'Cafeteria', 'Auditorium', 'Lab A', 'Lab B'];

export function RoomTracker({ currentRoom, onRoomChange, roleLabel = 'User' }: RoomTrackerProps) {
  const [showModal, setShowModal] = useState(false);
  const [action, setAction]       = useState<'enter' | 'exit'>('enter');
  const [roomNumber, setRoomNumber] = useState('');
  const [justDone, setJustDone]   = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cardRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showModal && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.8, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.7)' }
      );
    }
  }, [showModal]);

  const openModal = (a: 'enter' | 'exit') => {
    setAction(a);
    setRoomNumber('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRoomChange(roomNumber, action);
    setShowModal(false);
    setJustDone(true);
    setTimeout(() => setJustDone(false), 2500);
    // Bounce the card
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    }
  };

  return (
    <>
      <div ref={cardRef} className="glass-card p-6 card-shine relative overflow-hidden"
        style={{ borderColor: 'rgba(0,240,255,0.25)' }}>
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)' }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="radar-pulse w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.35)' }}>
              📍
            </div>
            <div>
              <h3 className="font-black text-white text-base">Location</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`status-dot ${currentRoom ? 'online' : 'offline'}`} />
                <span className="text-xs font-semibold" style={{ color: currentRoom ? '#00ff87' : 'rgba(255,255,255,0.25)' }}>
                  {currentRoom ? 'Checked In' : 'Not Checked In'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Room Display */}
        <div className="mb-5 text-center py-4 rounded-2xl"
          style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.1)' }}>
          {currentRoom ? (
            <>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-1 font-bold">Currently In</div>
              <div className="text-4xl font-black font-orbitron text-neon-cyan">{currentRoom}</div>
              {justDone && (
                <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-bold text-neon-mint animate-bounce-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Updated!
                </div>
              )}
            </>
          ) : (
            <div className="text-white/15 font-bold text-lg">No Location</div>
          )}
        </div>

        {/* ENTRY / EXIT BIG BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => openModal('enter')} className="btn-enter rounded-full btn-shimmer flex items-center justify-center gap-2">
            <span className="text-lg">🚪</span>
            <span>ENTER</span>
          </button>
          <button onClick={() => openModal('exit')} className="btn-exit rounded-full btn-shimmer flex items-center justify-center gap-2"
            disabled={!currentRoom} style={{ opacity: currentRoom ? 1 : 0.4 }}>
            <span className="text-lg">🏃</span>
            <span>EXIT</span>
          </button>
        </div>
        {!currentRoom && (
          <p className="text-xs text-white/20 text-center mt-2">Enter a room first to enable exit</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)' }}>
          <div ref={modalRef} className="w-full max-w-sm">
            <div className="glass-card p-7 card-shine"
              style={{ borderColor: action === 'enter' ? 'rgba(0,255,135,0.5)' : 'rgba(255,0,110,0.5)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{action === 'enter' ? '🚪' : '🏃'}</span>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {action === 'enter' ? 'Enter Room' : 'Exit Room'}
                    </h2>
                    <p className="text-xs font-semibold" style={{ color: action === 'enter' ? '#00ff87' : '#ff006e' }}>
                      {roleLabel} • Location Update
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {action === 'exit' && currentRoom ? (
                <form onSubmit={e => { e.preventDefault(); setRoomNumber(currentRoom); handleSubmit(e); }}>
                  <div className="p-5 rounded-2xl mb-5 text-center"
                    style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.3)' }}>
                    <div className="text-xs text-white/40 mb-1">Exiting from</div>
                    <div className="text-3xl font-black font-orbitron" style={{ color: '#ff006e' }}>{currentRoom}</div>
                  </div>
                  <button type="submit"
                    className="w-full py-4 rounded-full font-black text-white text-base btn-shimmer transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #ff006e, #ff4d00)', boxShadow: '0 8px 25px rgba(255,0,110,0.4)' }}>
                    🏃 Confirm Exit
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Select Room</label>
                    <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                      {rooms.map(room => (
                        <button key={room} type="button"
                          onClick={() => setRoomNumber(room)}
                          className="p-3 rounded-full text-sm font-bold transition-all hover:scale-105 btn-shimmer"
                          style={{
                            background: roomNumber === room ? 'rgba(0,255,135,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${roomNumber === room ? '#00ff87' : 'rgba(255,255,255,0.08)'}`,
                            color: roomNumber === room ? '#00ff87' : 'rgba(255,255,255,0.5)',
                            boxShadow: roomNumber === room ? '0 0 15px rgba(0,255,135,0.3)' : 'none',
                          }}>
                          {room}
                        </button>
                      ))}
                    </div>
                  </div>

                  {roomNumber && (
                    <div className="p-3 rounded-xl text-center animate-slide-in-up"
                      style={{ background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.25)' }}>
                      <span className="text-sm font-bold" style={{ color: '#00ff87' }}>Room {roomNumber} selected ✓</span>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-glass flex-1 py-3 rounded-full font-bold">Cancel</button>
                    <button type="submit" disabled={!roomNumber}
                      className="btn-enter flex-1 py-3 rounded-full btn-shimmer disabled:opacity-30 transition-all">
                      🚪 Confirm Entry
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
