"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Lock, Droplets, TrendingUp, ExternalLink, CheckCircle2,
  Loader2, Zap, Shield, BarChart3, Sparkles, ArrowRight, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

const TIERS = [
  { days: 30, bps: 125, rate: "1.25%", apr: "~15% APR", label: "Bronze", gradient: "from-amber-700/60 to-amber-600/40", border: "border-amber-600/30", glow: "shadow-amber-600/20", badge: "" },
  { days: 60, bps: 300, rate: "3.00%", apr: "~18% APR", label: "Silver", gradient: "from-slate-400/40 to-slate-300/20", border: "border-slate-400/30", glow: "shadow-slate-400/20", badge: "Popular" },
  { days: 90, bps: 600, rate: "6.00%", apr: "~24% APR", label: "Gold",   gradient: "from-yellow-500/50 to-amber-400/30", border: "border-yellow-500/40", glow: "shadow-yellow-500/25", badge: "Best Rate" },
];

export default function SavingsPage() {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"staking" | "pool">("staking");
  const [ticker, setTicker]     = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/savings/positions");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(() => setTicker(t => t + 1), 10000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const summary = data?.summary;
  const stakes  = data?.stakes  || [];
  const pools   = data?.pools   || [];

  return (
    <div className="space-y-10 pb-24 max-w-2xl mx-auto">

      {/* ── Hero Header ── */}
      <section className="relative">
        <div className="absolute -top-8 left-0 w-64 h-64 bg-[#C694F9]/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C694F9] to-[#94A1F9] flex items-center justify-center shadow-lg shadow-[#C694F9]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C694F9]/70">ExpoPay Vault</span>
          </div>
          <h1 className="text-[clamp(2.5rem,9vw,4.5rem)] font-black tracking-tight uppercase leading-[0.85] mb-4"
            style={{ fontFamily: 'var(--font-syne)' }}>
            EARN<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C694F9] via-[#F5A7C4] to-[#94A1F9]">REWARDS</span>
          </h1>
          <p className="text-white/40 text-sm font-medium max-w-sm">
            Stake EXPO or deposit XLM to earn rewards on-chain via Stellar smart contracts.
          </p>
          <div className="mt-4 flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-2xl px-4 py-3">
            <span className="text-amber-400 text-sm shrink-0">⚠️</span>
            <p className="text-[10px] text-amber-400/60 font-medium leading-relaxed">
              Staking rewards are taxable as VDA income at 30% under the Income Tax Act, 1961. Returns are variable and not guaranteed.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-[#C694F9]" />
            <div className="absolute inset-0 blur-xl bg-[#C694F9]/20 rounded-full" />
          </div>
          <p className="text-white/30 text-xs font-black uppercase tracking-widest">Loading positions…</p>
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <section className="grid grid-cols-2 gap-3">
            <StatCard label="Staked EXPO" value={(summary?.total_staked_expo || 0).toFixed(2)} sub="EXPO" icon={<Lock className="w-4 h-4" />} color="purple" />
            <StatCard label="In Pool"     value={(summary?.total_in_pool_xlm || 0).toFixed(2)}  sub="XLM"  icon={<Droplets className="w-4 h-4" />} color="cyan" />
            <StatCard label="Active Stakes"     value={summary?.active_stakes || 0}         sub="positions" icon={<Flame className="w-4 h-4" />}    color="orange" />
            <StatCard label="Pool Positions"    value={summary?.active_pool_positions || 0} sub="positions" icon={<BarChart3 className="w-4 h-4" />} color="green" />
          </section>

          {/* ── Tab switcher ── */}
          <section className="relative flex p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            {(["staking", "pool"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="vault-tab"
                    className="absolute inset-0 bg-gradient-to-r from-[#C694F9]/20 to-[#94A1F9]/10 rounded-xl border border-[#C694F9]/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className={cn("relative z-10 transition-colors", activeTab === tab ? "text-[#C694F9]" : "text-white/30")}>
                  {tab === "staking" ? "🔒 EXPO Staking" : "💧 XLM Pool"}
                </span>
              </button>
            ))}
          </section>

          <AnimatePresence mode="wait">
            {activeTab === "staking" && (
              <motion.section key="staking" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">

                {/* Tier cards */}
                <div className="grid grid-cols-3 gap-3">
                  {TIERS.map(tier => (
                    <motion.div
                      key={tier.days}
                      whileHover={{ y: -4, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className={cn(
                        "relative overflow-hidden rounded-3xl border p-4 space-y-3 cursor-default",
                        `bg-gradient-to-b ${tier.gradient}`,
                        tier.border,
                        `shadow-lg ${tier.glow}`
                      )}
                    >
                      {tier.badge && (
                        <span className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-wider bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded-full">
                          {tier.badge}
                        </span>
                      )}
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">{tier.label}</p>
                      <div>
                        <p className="font-black text-3xl text-white leading-none">{tier.rate}</p>
                        <p className="text-[10px] text-white/40 font-bold mt-1">{tier.apr} est.</p>
                      </div>
                      <div className="h-px bg-white/10" />
                      <p className="font-black text-sm text-white/70">{tier.days} Days</p>
                    </motion.div>
                  ))}
                </div>

                <Link href="/dashboard/savings/stake">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full h-16 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-[#C694F9]/30 flex items-center justify-center gap-3 group"
                  >
                    <Lock className="w-5 h-5" />
                    Stake EXPO Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>

                {stakes.filter((s: any) => s.status === 'active').length > 0 && (
                  <div className="space-y-3">
                    <SectionLabel>Active Stakes</SectionLabel>
                    {stakes.filter((s: any) => s.status === 'active').map((s: any) => (
                      <StakeCard key={s.id} stake={s} onAction={fetchData} />
                    ))}
                  </div>
                )}

                {stakes.filter((s: any) => s.status !== 'active').length > 0 && (
                  <div className="space-y-3">
                    <SectionLabel>Completed</SectionLabel>
                    {stakes.filter((s: any) => s.status !== 'active').map((s: any) => (
                      <StakeCard key={s.id} stake={s} onAction={fetchData} />
                    ))}
                  </div>
                )}

                {stakes.length === 0 && <EmptyHint text="Stake your EXPO tokens to earn rewards. Choose a lock period above." />}
              </motion.section>
            )}

            {activeTab === "pool" && (
              <motion.section key="pool" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">

                {/* Pool hero card */}
                <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-[#94A1F9]/10 p-6">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#C694F9]/10 rounded-full blur-3xl" />
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <Droplets className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-black text-lg">EXPO Yield Pool</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Deposit XLM → Earn EXPO Daily</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Est. APR", value: "~18%", color: "text-cyan-400" },
                        { label: "Lock-up",  value: "None",  color: "text-green-400" },
                        { label: "Rewards",  value: "EXPO",  color: "text-[#C694F9]" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white/5 rounded-2xl p-3 text-center">
                          <p className={cn("font-black text-xl", color)}>{value}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">
                      No lock-up — withdraw anytime with accrued EXPO. Powered by ExpoPay smart contracts on Stellar.
                    </p>
                  </div>
                </div>

                <Link href="/dashboard/savings/pool">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full h-16 bg-gradient-to-r from-cyan-500 to-[#C694F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-cyan-500/20 flex items-center justify-center gap-3 group"
                  >
                    <Droplets className="w-5 h-5" />
                    Deposit to Pool
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>

                {pools.filter((p: any) => p.status === 'active').length > 0 && (
                  <div className="space-y-3">
                    <SectionLabel>Your Pool Positions</SectionLabel>
                    {pools.filter((p: any) => p.status === 'active').map((pos: any) => (
                      <PoolCard key={pos.id} position={pos} ticker={ticker} onAction={fetchData} />
                    ))}
                  </div>
                )}

                {pools.filter((p: any) => p.status !== 'active').length > 0 && (
                  <div className="space-y-3">
                    <SectionLabel>Closed Positions</SectionLabel>
                    {pools.filter((p: any) => p.status !== 'active').map((pos: any) => (
                      <PoolCard key={pos.id} position={pos} ticker={ticker} onAction={fetchData} />
                    ))}
                  </div>
                )}

                {pools.length === 0 && <EmptyHint text="Deposit XLM to start earning EXPO rewards. No lock-up — withdraw anytime." />}
              </motion.section>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25 flex items-center gap-2">
    <span className="flex-1 h-px bg-white/5" />{children}<span className="flex-1 h-px bg-white/5" />
  </p>;
}

function StatCard({ label, value, sub, icon, color }: any) {
  const styles: any = {
    purple: { ring: "from-[#C694F9]/20 to-[#94A1F9]/10", icon: "bg-[#C694F9]/15 border-[#C694F9]/25 text-[#C694F9]", val: "text-white" },
    cyan:   { ring: "from-cyan-500/15 to-cyan-400/5",     icon: "bg-cyan-500/15   border-cyan-500/25   text-cyan-400",   val: "text-white" },
    orange: { ring: "from-orange-500/15 to-red-400/5",    icon: "bg-orange-500/15 border-orange-500/25 text-orange-400", val: "text-white" },
    green:  { ring: "from-green-500/15 to-emerald-400/5", icon: "bg-green-500/15  border-green-500/25  text-green-400",  val: "text-white" },
  };
  const s = styles[color];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br p-4", s.ring)}>
      <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center mb-3", s.icon)}>{icon}</div>
      <p className="font-black text-2xl tracking-tight">{value} <span className="text-white/30 text-xs font-bold">{sub}</span></p>
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{label}</p>
    </div>
  );
}

function StakeCard({ stake, onAction }: any) {
  const [unstaking, setUnstaking] = useState(false);
  const [error, setError]         = useState("");
  const isUnlocked = new Date() >= new Date(stake.unlocks_at);
  const isActive   = stake.status === 'active';
  const tier       = TIERS.find(t => t.days === stake.duration_days) || TIERS[0];

  const handleUnstake = async () => {
    setUnstaking(true); setError("");
    try {
      const res  = await fetch('/api/savings/unstake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position_id: stake.id }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Unstake failed'); return; }
      onAction();
    } catch { setError('Network error'); }
    finally { setUnstaking(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4"
    >
      <div className={cn("absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-60", tier.gradient)} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border text-lg shrink-0",
            stake.status === 'completed' ? "bg-green-500/10 border-green-500/20 text-green-400"
            : isUnlocked ? "bg-amber-500/10 border-amber-500/20"
            : `bg-gradient-to-br ${tier.gradient} ${tier.border}`)}>
            {stake.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5 text-white/70" />}
          </div>
          <div>
            <p className="font-black text-base">{stake.amount_expo} <span className="text-white/40">EXPO</span></p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {stake.duration_days}-day · <span className={tier.border.replace('border-', 'text-').replace('/30', '/80').replace('/40', '/80')}>{tier.rate}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-sm text-green-400">+{stake.reward_expo.toFixed(4)} EXPO</p>
          <p className="text-[9px] text-white/30 font-bold">earned</p>
        </div>
      </div>

      {isActive && (
        <div>
          <div className="flex justify-between text-[10px] font-bold text-white/30 mb-2">
            <span>{isUnlocked ? "✅ Ready to unstake" : `Unlocks ${formatDistanceToNow(new Date(stake.unlocks_at), { addSuffix: true })}`}</span>
            <span>{format(new Date(stake.unlocks_at), 'MMM d, yyyy')}</span>
          </div>
          <LockProgress stakedAt={stake.staked_at} unlocksAt={stake.unlocks_at} />
        </div>
      )}

      {stake.tx_hash_stake && (
        <a href={`https://stellar.expert/explorer/testnet/tx/${stake.tx_hash_stake}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors w-fit">
          <ExternalLink className="w-3 h-3" /> View on-chain
        </a>
      )}

      {error && <p className="text-red-400 text-xs font-bold bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}

      {isActive && isUnlocked && (
        <button onClick={handleUnstake} disabled={unstaking}
          className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-400 rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
          {unstaking ? <><Loader2 className="w-4 h-4 animate-spin" /> Unstaking…</> : '🎉 Collect Rewards'}
        </button>
      )}
    </motion.div>
  );
}

function PoolCard({ position, ticker, onAction }: any) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError]             = useState("");
  const isActive = position.status === 'active';
  const daysElapsed = (Date.now() - new Date(position.deposited_at).getTime()) / 86400000;
  const liveAccrued = isActive
    ? (parseFloat(position.amount_xlm) * 50 * daysElapsed) / 10000
    : parseFloat(position.expo_earned || 0);

  const handleWithdraw = async () => {
    setWithdrawing(true); setError("");
    try {
      const res  = await fetch('/api/savings/pool/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position_id: position.id }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Withdrawal failed'); return; }
      onAction();
    } catch { setError('Network error'); }
    finally { setWithdrawing(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4"
    >
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-[#C694F9] opacity-60" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0",
            isActive ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-green-500/10 border-green-500/20 text-green-400")}>
            {isActive ? <Droplets className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-black text-base">{position.amount_xlm} <span className="text-white/40">XLM</span></p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Deposited {format(new Date(position.deposited_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <motion.p key={`${ticker}-${position.id}`} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
            className="font-black text-sm text-[#C694F9]">
            +{liveAccrued.toFixed(4)} EXPO
          </motion.p>
          <p className="text-[9px] text-white/30 font-bold flex items-center justify-end gap-1">
            {isActive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />}
            {isActive ? "accruing live" : "earned"}
          </p>
        </div>
      </div>

      {position.tx_hash_deposit && (
        <a href={`https://stellar.expert/explorer/testnet/tx/${position.tx_hash_deposit}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors w-fit">
          <ExternalLink className="w-3 h-3" /> View deposit
        </a>
      )}

      {error && <p className="text-red-400 text-xs font-bold bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}

      {isActive && (
        <button onClick={handleWithdraw} disabled={withdrawing}
          className="w-full h-12 bg-gradient-to-r from-cyan-500 to-[#C694F9] rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
          {withdrawing ? <><Loader2 className="w-4 h-4 animate-spin" /> Withdrawing…</> : `Withdraw ${position.amount_xlm} XLM + EXPO`}
        </button>
      )}
    </motion.div>
  );
}

function LockProgress({ stakedAt, unlocksAt }: { stakedAt: string; unlocksAt: string }) {
  const start    = new Date(stakedAt).getTime();
  const end      = new Date(unlocksAt).getTime();
  const now      = Date.now();
  const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn("h-full rounded-full", progress >= 100 ? "bg-green-500" : "bg-gradient-to-r from-[#C694F9] to-[#94A1F9]")}
      />
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <TrendingUp className="w-7 h-7 text-white/20" />
      </div>
      <p className="text-sm font-medium text-white/25 max-w-xs">{text}</p>
    </div>
  );
}
