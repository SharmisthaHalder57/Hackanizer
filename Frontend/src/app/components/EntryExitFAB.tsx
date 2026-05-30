import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { X, CheckCircle2, DoorOpen, LogOut as ExitIcon } from 'lucide-react';

interface EntryExitFABProps {
  currentRoom: string | null;
  onRoomChange: (room: string, action: 'enter' | 'exit') => void;
  roleLabel?: string;
  roleColor?: string;
}

const rooms = ['101', '102', '103', '104', '105', '201', '202', '203', 'Cafeteria', 'Auditorium', 'Lab A', 'Lab B'];

export function EntryExitFAB({ currentRoom, onRoomChange, roleLabel = 'Member', roleColor = '#00ff87' }: EntryExitFABProps) {
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<'enter' | 'exit'>('enter');
  const [roomNumber, setRoomNumber] = useState('');
  const [justDone, setJustDone] = useState<'enter' | 'exit' | null>(null);
  const [fabExpanded, setFabExpanded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showModal && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.85, opacity: 0, y: 40 },
        { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.7)' }
      );
    }
  }, [showModal]);

  // Pulse FAB on mount
  useEffect(() => {
    if (fabRef.current) {
      gsap.from(fabRef.current, { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(2)', delay: 1 });
    }
  }, []);

  const openModal = (a: 'enter' | 'exit') => {
    setAction(a);
    setRoomNumber('');
    setShowModal(true);
    setFabExpanded(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = action === 'exit' && currentRoom ? currentRoom : roomNumber;
    onRoomChange(targetRoom, action);
    setShowModal(false);
    setJustDone(action);
    setTimeout(() => setJustDone(null), 3000);
  };

  const isExitDisabled = !currentRoom;
  const enterColor = '#00ff87';
  const exitColor = '#ff006e';

  return (
    <>
      {/* ── FAB ── */}
      <div ref={fabRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">

        {/* Expanded sub-buttons */}
        {fabExpanded && (
          <div className="flex flex-col gap-2 items-end animate-slide-in-up">
            {/* Exit sub-button */}
            <button
              onClick={() => openModal('exit')}
              disabled={isExitDisabled}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-sm btn-shimmer transition-all hover:scale-105"
              style={{
                background: isExitDisabled ? 'rgba(255,0,110,0.15)' : 'linear-gradient(135deg, #ff006e, #ff4d00)',
                color: isExitDisabled ? 'rgba(255,255,255,0.3)' : '#fff',
                border: `1.5px solid ${isExitDisabled ? 'rgba(255,0,110,0.2)' : 'rgba(255,0,110,0.6)'}`,
                boxShadow: isExitDisabled ? 'none' : '0 6px 25px rgba(255,0,110,0.5)',
                opacity: isExitDisabled ? 0.5 : 1,
              }}
            >
              <ExitIcon className="w-4 h-4" />
              EXIT ROOM
              {currentRoom && <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-black"
                style={{ background: 'rgba(255,255,255,0.2)' }}>{currentRoom}</span>}
            </button>

            {/* Enter sub-button */}
            <button
              onClick={() => openModal('enter')}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-sm btn-shimmer transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00ff87, #00c6ff)',
                color: '#000',
                border: '1.5px solid rgba(0,255,135,0.6)',
                boxShadow: '0 6px 25px rgba(0,255,135,0.5)',
              }}
            >
              <DoorOpen className="w-4 h-4" />
              ENTER ROOM
            </button>
          </div>
        )}

        {/* Current room indicator */}
        {currentRoom && !fabExpanded && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black animate-slide-in-up"
            style={{ background: 'rgba(0,255,135,0.15)', border: '1px solid rgba(0,255,135,0.4)', color: '#00ff87' }}>
            <span className="status-dot online" />
            Room {currentRoom}
          </div>
        )}

        {/* Just done toast */}
        {justDone && !fabExpanded && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black animate-bounce-in"
            style={{
              background: justDone === 'enter' ? 'rgba(0,255,135,0.2)' : 'rgba(255,0,110,0.2)',
              border: `1px solid ${justDone === 'enter' ? 'rgba(0,255,135,0.5)' : 'rgba(255,0,110,0.5)'}`,
              color: justDone === 'enter' ? '#00ff87' : '#ff006e',
            }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {justDone === 'enter' ? 'Checked in!' : 'Checked out!'}
          </div>
        )}

        {/* Main FAB toggle button */}
        <button
          onClick={() => setFabExpanded(e => !e)}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 btn-shimmer"
          style={{
            background: fabExpanded
              ? 'rgba(255,255,255,0.1)'
              : `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
            border: `2px solid ${fabExpanded ? 'rgba(255,255,255,0.2)' : roleColor}`,
            boxShadow: fabExpanded
              ? 'none'
              : `0 0 30px ${roleColor}60, 0 8px 25px ${roleColor}40`,
            transform: fabExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          {fabExpanded ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}>🚪</span>
          )}
        </button>
      </div>

      {/* ── Room Selection Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)' }}>
          <div ref={modalRef} className="w-full max-w-sm">
            <div className="rounded-[2rem] p-8"
              style={{
                background: 'rgba(10,10,10,0.95)',
                border: `1.5px solid ${action === 'enter' ? 'rgba(0,255,135,0.5)' : 'rgba(255,0,110,0.5)'}`,
                backdropFilter: 'blur(32px)',
                boxShadow: action === 'enter'
                  ? '0 0 60px rgba(0,255,135,0.25), 0 25px 50px rgba(0,0,0,0.7)'
                  : '0 0 60px rgba(255,0,110,0.25), 0 25px 50px rgba(0,0,0,0.7)',
              }}>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{
                      background: action === 'enter' ? 'rgba(0,255,135,0.1)' : 'rgba(255,0,110,0.1)',
                      border: `1.5px solid ${action === 'enter' ? 'rgba(0,255,135,0.3)' : 'rgba(255,0,110,0.3)'}`,
                    }}>
                    {action === 'enter' ? '🚪' : '🏃'}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {action === 'enter' ? 'Enter Room' : 'Exit Room'}
                    </h2>
                    <p className="text-xs font-bold"
                      style={{ color: action === 'enter' ? '#00ff87' : '#ff006e' }}>
                      {roleLabel} · Location Update
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Exit confirmation */}
              {action === 'exit' && currentRoom ? (
                <form onSubmit={e => { e.preventDefault(); setRoomNumber(currentRoom); handleSubmit(e); }}>
                  <div className="p-5 rounded-2xl mb-5 text-center"
                    style={{ background: 'rgba(255,0,110,0.08)', border: '1px solid rgba(255,0,110,0.3)' }}>
                    <div className="text-xs text-white/40 mb-1 uppercase tracking-widest font-bold">Exiting from</div>
                    <div className="text-4xl font-black font-orbitron" style={{ color: '#ff006e' }}>{currentRoom}</div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="btn-glass flex-1 py-3 rounded-full font-bold text-sm">Cancel</button>
                    <button type="submit"
                      className="flex-1 py-3 rounded-full font-black text-white text-sm btn-shimmer"
                      style={{ background: 'linear-gradient(135deg, #ff006e, #ff4d00)', boxShadow: '0 8px 25px rgba(255,0,110,0.4)' }}>
                      🏃 Confirm Exit
                    </button>
                  </div>
                </form>
              ) : (
                /* Enter: room selection */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-white/30 uppercase tracking-widest mb-3">Select Room</label>
                    <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {rooms.map(room => (
                        <button key={room} type="button"
                          onClick={() => setRoomNumber(room)}
                          className="p-3 rounded-full text-sm font-black transition-all hover:scale-105 btn-shimmer"
                          style={{
                            background: roomNumber === room ? 'rgba(0,255,135,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${roomNumber === room ? '#00ff87' : 'rgba(255,255,255,0.08)'}`,
                            color: roomNumber === room ? '#00ff87' : 'rgba(255,255,255,0.45)',
                            boxShadow: roomNumber === room ? '0 0 18px rgba(0,255,135,0.35)' : 'none',
                          }}>
                          {room}
                        </button>
                      ))}
                    </div>
                  </div>

                  {roomNumber && (
                    <div className="p-3 rounded-xl text-center animate-slide-in-up"
                      style={{ background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.25)' }}>
                      <span className="text-sm font-black" style={{ color: '#00ff87' }}>
                        ✓ Room {roomNumber} selected
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="btn-glass flex-1 py-3 rounded-full font-bold text-sm">Cancel</button>
                    <button type="submit" disabled={!roomNumber}
                      className="flex-1 py-3 rounded-full font-black text-black text-sm btn-shimmer disabled:opacity-30 transition-all"
                      style={{ background: 'linear-gradient(135deg, #00ff87, #00c6ff)', boxShadow: '0 8px 25px rgba(0,255,135,0.4)' }}>
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
