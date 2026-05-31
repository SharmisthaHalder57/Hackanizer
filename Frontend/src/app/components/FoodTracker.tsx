/**
 * FoodTracker.tsx — Meal coupon cards with QR code claim flow
 *
 * QR Flow:
 *  1. User presses "Claim" on a meal card
 *  2. Component calls GET /api/meals/qr/{meal_type} → gets a base64 QR image
 *  3. A modal pops up instantly showing the QR code
 *  4. User scans the QR with any QR-reader app
 *     OR an organizer station scans it → POST /api/meals/claim/qr is called
 *  5. On success → meal marked as claimed, modal closes, "Claimed" badge appears
 *     Organizer dashboard updates in real-time via Firestore listener.
 */
import { useRef, useState, useCallback } from 'react';
import { Coffee, Utensils, Moon, Check, Ticket, X, Loader2, RefreshCw } from 'lucide-react';
import gsap from 'gsap';

interface FoodTrackerProps {
    meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
    onMealReceived: (mealType: 'breakfast' | 'lunch' | 'dinner') => void;
}

const mealTypes = [
    { type: 'breakfast' as const, icon: Coffee, label: 'Breakfast', sub: '7:00 – 9:00 AM', color: '#f97316', gradient: 'from-orange-500 to-yellow-500' },
    { type: 'lunch' as const, icon: Utensils, label: 'Lunch', sub: '1:00 – 2:30 PM', color: '#10b981', gradient: 'from-emerald-500 to-teal-500' },
    { type: 'dinner' as const, icon: Moon, label: 'Dinner', sub: '7:00 – 9:00 PM', color: '#a855f7', gradient: 'from-violet-500 to-purple-500' },
];

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface QRData {
    mealType: MealType;
    qrImage: string;   // data:image/png;base64,...
    token: string;     // raw token, needed to claim after scanning
    expiresAt: number; // unix timestamp ms
}

export function FoodTracker({ meals, onMealReceived }: FoodTrackerProps) {
    const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // QR modal state
    const [qrData, setQrData] = useState<QRData | null>(null);
    const [qrLoading, setQrLoading] = useState<MealType | null>(null);
    const [qrError, setQrError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);

    // ── Countdown timer ──────────────────────────────────────────────────────
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCountdown = useCallback((expiresAt: number) => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        const tick = () => {
            const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
            setSecondsLeft(left);
            if (left === 0 && countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
        tick();
        countdownRef.current = setInterval(tick, 1000);
    }, []);

    const stopCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    // ── Fetch QR from backend ─────────────────────────────────────────────────
    const fetchQR = async (mealType: MealType) => {
        setQrLoading(mealType);
        setQrError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/meals/qr/${mealType}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Failed to generate QR' }));
                throw new Error(err.detail ?? `HTTP ${res.status}`);
            }
            const data = await res.json();
            const newQR: QRData = {
                mealType,
                qrImage: data.qr_image,
                token: data.token,
                expiresAt: Date.now() + data.expires_in_seconds * 1000,
            };
            setQrData(newQR);
            setClaimError(null);
            startCountdown(newQR.expiresAt);
        } catch (e: any) {
            setQrError(e.message);
        } finally {
            setQrLoading(null);
        }
    };

    // ── Claim via QR token (called after user scans or manually confirms) ─────
    const claimViaQR = async () => {
        if (!qrData) return;
        setClaiming(true);
        setClaimError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/meals/claim/qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ qr_token: qrData.token }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Claim failed' }));
                throw new Error(err.detail ?? `HTTP ${res.status}`);
            }

            // Animate the card
            const el = ticketRefs.current[qrData.mealType];
            if (el) {
                await gsap.timeline()
                    .to(el, { rotateY: 90, duration: 0.25, ease: 'power2.in' })
                    .call(() => onMealReceived(qrData.mealType))
                    .to(el, { rotateY: 0, duration: 0.35, ease: 'back.out(1.5)' });
            } else {
                onMealReceived(qrData.mealType);
            }

            closeModal();
        } catch (e: any) {
            setClaimError(e.message);
        } finally {
            setClaiming(false);
        }
    };

    const closeModal = () => {
        stopCountdown();
        setQrData(null);
        setQrError(null);
        setClaimError(null);
        setClaiming(false);
    };

    const refreshQR = () => {
        if (qrData) fetchQR(qrData.mealType);
    };

    // ── Open QR Modal ─────────────────────────────────────────────────────────
    const handleClaim = (type: MealType) => {
        fetchQR(type);
    };

    const received = Object.values(meals).filter(Boolean).length;
    const qrMeal = mealTypes.find(m => m.type === qrData?.mealType);
    const isExpired = qrData ? Date.now() >= qrData.expiresAt : false;

    return (
        <>
            {/* ── Meal Cards ────────────────────────────────────────────────────── */}
            <div className="glass-card p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(0,255,135,0.15)', border: '1px solid rgba(0,255,135,0.4)' }}
                        >
                            <Ticket className="w-5 h-5 text-[#00ff87]" />
                        </div>
                        <div>
                            <h3 className="text-white font-black">Food Coupons</h3>
                            <p className="text-xs text-white/40">{received}/3 claimed today</p>
                        </div>
                    </div>
                    {/* Progress dots */}
                    <div className="flex gap-1">
                        {mealTypes.map(m => (
                            <div key={m.type} className="w-2 h-8 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div className="w-full transition-all duration-500"
                                    style={{
                                        height: meals[m.type] ? '100%' : '0%',
                                        background: m.color,
                                        boxShadow: meals[m.type] ? `0 0 8px ${m.color}` : 'none',
                                        borderRadius: '9999px',
                                    }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ticket Cards */}
                <div className="space-y-3">
                    {mealTypes.map(({ type, icon: Icon, label, sub, color, gradient }) => (
                        <div
                            key={type}
                            ref={el => { ticketRefs.current[type] = el; }}
                            className="relative overflow-hidden rounded-[1.5rem] transition-all duration-300"
                            style={{
                                background: meals[type]
                                    ? `linear-gradient(135deg, ${color}15, ${color}08)`
                                    : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${meals[type] ? color + '50' : 'rgba(255,255,255,0.07)'}`,
                                transformStyle: 'preserve-3d',
                            }}
                        >
                            {/* Perforated left strip */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[1.5rem]"
                                style={{ background: `linear-gradient(to bottom, ${color}, ${color}80)` }} />

                            {/* Dot pattern */}
                            <div className="absolute left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="w-1 h-1 rounded-full"
                                        style={{ background: 'rgba(255,255,255,0.08)' }} />
                                ))}
                            </div>

                            <div className="flex items-center p-4 pl-6 gap-4">
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient}`}
                                    style={{ boxShadow: meals[type] ? `0 0 16px ${color}60` : 'none' }}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white text-base">{label}</div>
                                    <div className="text-xs" style={{ color: meals[type] ? color : 'rgba(255,255,255,0.3)' }}>{sub}</div>
                                </div>

                                {/* Dashed separator */}
                                <div className="w-px self-stretch mx-1"
                                    style={{ borderLeft: '1.5px dashed rgba(255,255,255,0.1)' }} />

                                {/* Action */}
                                {meals[type] ? (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full flex-shrink-0"
                                        style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                                        <Check className="w-4 h-4" style={{ color }} />
                                        <span className="text-sm font-bold" style={{ color }}>Claimed</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleClaim(type)}
                                        disabled={qrLoading === type}
                                        className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                        style={{
                                            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                                            boxShadow: `0 4px 12px ${color}40`,
                                        }}
                                    >
                                        {qrLoading === type && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {qrLoading === type ? 'Loading…' : 'Claim'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── QR Modal ──────────────────────────────────────────────────────── */}
            {(qrData || qrError) && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div
                        className="relative rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                        style={{
                            background: 'rgba(15,15,25,0.97)',
                            border: `1px solid ${qrMeal ? qrMeal.color + '40' : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: qrMeal ? `0 0 60px ${qrMeal.color}20` : undefined,
                        }}
                    >
                        {/* Close */}
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                        >
                            <X className="w-4 h-4 text-white/60" />
                        </button>

                        {/* Header */}
                        {qrMeal && (
                            <div className="flex items-center gap-3 mb-5">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${qrMeal.gradient}`}>
                                    <qrMeal.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-lg">{qrMeal.label} Coupon</h2>
                                    <p className="text-xs text-white/40">Scan this QR code to claim your meal</p>
                                </div>
                            </div>
                        )}

                        {/* Error state */}
                        {qrError && (
                            <div className="text-center py-8">
                                <p className="text-red-400 mb-4">{qrError}</p>
                                <button
                                    onClick={refreshQR}
                                    className="px-4 py-2 rounded-full text-sm font-bold text-white"
                                    style={{ background: qrMeal ? qrMeal.color : '#6366f1' }}
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* QR Image */}
                        {qrData && !qrError && (
                            <>
                                {/* QR code container */}
                                <div
                                    className="rounded-2xl p-4 mb-4 flex items-center justify-center relative"
                                    style={{ background: 'white' }}
                                >
                                    {isExpired ? (
                                        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center"
                                            style={{ background: 'rgba(0,0,0,0.7)' }}>
                                            <p className="text-white font-bold mb-2">QR Expired</p>
                                            <button
                                                onClick={refreshQR}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                                                style={{ background: qrMeal?.color ?? '#6366f1' }}
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Refresh
                                            </button>
                                        </div>
                                    ) : null}
                                    <img
                                        src={qrData.qrImage}
                                        alt={`${qrData.mealType} meal QR code`}
                                        className="w-48 h-48 object-contain"
                                        style={{ opacity: isExpired ? 0.3 : 1 }}
                                    />
                                </div>

                                {/* Countdown */}
                                {!isExpired && (
                                    <div className="text-center mb-4">
                                        <p className="text-xs text-white/40 mb-1">QR expires in</p>
                                        <p
                                            className="text-2xl font-black tabular-nums"
                                            style={{ color: secondsLeft < 30 ? '#ef4444' : qrMeal?.color ?? '#00ff87' }}
                                        >
                                            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                                        </p>
                                    </div>
                                )}

                                {/* Instructions */}
                                <p className="text-center text-xs text-white/40 mb-5">
                                    Show this QR to the organizer station, or scan it yourself after the organizer confirms.
                                </p>

                                {/* Claim error */}
                                {claimError && (
                                    <p className="text-center text-red-400 text-sm mb-3">{claimError}</p>
                                )}

                                {/* Claim button — user presses after the organizer scans,
                    OR use this as a self-confirm (organizer station flow uses the API directly) */}
                                <button
                                    onClick={claimViaQR}
                                    disabled={claiming || isExpired}
                                    className="w-full py-3 rounded-2xl text-white font-black text-base transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{
                                        background: qrMeal
                                            ? `linear-gradient(135deg, ${qrMeal.color}, ${qrMeal.color}aa)`
                                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        boxShadow: qrMeal ? `0 8px 24px ${qrMeal.color}40` : undefined,
                                    }}
                                >
                                    {claiming && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {claiming ? 'Claiming…' : 'Confirm Claim'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}