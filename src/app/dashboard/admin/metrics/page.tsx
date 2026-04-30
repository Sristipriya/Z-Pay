"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Activity, Zap, RefreshCw, Loader2, ArrowUpRight, Shield, BarChart2, Calendar, ChevronDown, Radio } from "lucide-react";

interface MetricsSummary {
  total_users: number; active_users_30d: number; active_users_7d: number;
  total_transactions: number; transactions_30d: number; transactions_7d: number;
  volume_30d: number; retention_rate: number; gasless_transactions: number;
}
interface DailyStat { date: string; transactions: number; volume: number; dau: number; }
interface TopUser { universal_id: string; tx_count: number; }
interface RecentSignup { universal_id: string; full_name: string; created_at: string; preferred_currency: string; }

function SparkLine({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const w = 200; const h = height;
  if (data.length < 2) return null;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const BAR_HEIGHT_PX = 80;

function InteractiveBarChart({ data, color, label }: { data: { date: string; value: number }[]; color: string; label: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      <div className="relative flex items-end gap-[3px]" style={{ height: BAR_HEIGHT_PX }}>
        {data.map((d, i) => {
          const barH = d.value > 0 ? Math.max((d.value / max) * (BAR_HEIGHT_PX - 4), 6) : 2;
          return (
            <div key={d.date} className="relative flex-1 flex flex-col justify-end cursor-pointer h-full"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {hovered === i && (
                <div className="absolute z-20 bg-black/90 border border-white/20 rounded-lg px-2 py-1 text-[9px] font-bold whitespace-nowrap pointer-events-none"
                  style={{ bottom: barH + 6, left: "50%", transform: "translateX(-50%)" }}>
                  <span className="text-white/60">{d.date.slice(5)} · </span>
                  <span style={{ color }}>{d.value} {label}</span>
                </div>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ delay: i * 0.025, duration: 0.5, ease: "easeOut" }}
                className="w-full rounded-t-sm"
                style={{ background: `linear-gradient(to top, ${color}cc, ${color}55)`, opacity: hovered === i ? 1 : 0.7 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-white/20 font-bold">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map(d => (
          <span key={d.date}>{d.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

function RingMini({ pct, color, size = 60 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 5; const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (Math.min(pct,100) / 100) * c }}
        transition={{ duration: 1.2, ease: "easeOut" }} />
    </svg>
  );
}

const CARD_DETAILS: Record<string, { description: string; tips: string[] }> = {
  "Total Users":    { description: "Unique accounts that have claimed a @expo Universal ID and activated a Stellar wallet.", tips: ["Share your referral link to grow faster", "Each user gets a Stellar testnet wallet on signup", "Target: 30+ for Black Belt"] },
  "DAU (7d avg)":   { description: "Distinct users active in the last 7 days — includes signups and payment senders.", tips: ["Send payment campaigns to drive DAU", "Each new signup counts as a DAU event", "Goal: >10 DAU consistently"] },
  "Txns (30d)":     { description: "Total P2P and merchant payment transactions processed in the last 30 days.", tips: ["Encourage split bills to multiply tx count", "Merchant payments count separately", "Each gasless tx also counts here"] },
  "Volume (30d)":   { description: "Total XLM value settled on Stellar in the last 30 days across all payment types.", tips: ["Volume grows with higher-value payments", "Merchant UPI bridge boosts XLM usage", "Staking deposits are tracked separately"] },
  "Retention":      { description: "% of users from earlier cohorts who remained active — measures platform stickiness.", tips: ["Send email reminders to inactive users", "Vault staking increases retention naturally", "Escrow contracts keep users engaged"] },
  "Gasless Txs ⚡": { description: "Payments where ExpoPay sponsored the XLM network fee via fee_bump_transaction.", tips: ["Enable the ⚡ toggle on the Send page", "Platform wallet must have XLM balance", "Sponsor address shows as fee_source on-chain"] },
  "All-time Txns":  { description: "Total lifetime transactions ever recorded on this platform across all users.", tips: ["Historical record — never decreases", "Includes failed/voided transactions too", "Exportable for audit purposes"] },
  "Security Score": { description: "Security checklist completion: 8 of 13 production security controls implemented.", tips: ["Hash app_pin with bcrypt before mainnet", "Add rate limiting to auth endpoints", "Encrypt stellar_secret at rest"] },
};

export default function MetricsDashboard() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [signups, setSignups] = useState<RecentSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartTab, setChartTab] = useState<"dau"|"volume"|"txns">("dau");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/metrics");
      if (r.status === 403) { setError("Admin access only"); return; }
      const d = await r.json();
      setSummary(d.summary); setDaily(d.daily_stats);
      setTopUsers(d.top_users); setSignups(d.recent_signups);
      setRefreshed(new Date());
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  if (loading && !summary) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-[#C694F9]/20 animate-ping" />
        <Loader2 className="absolute inset-3 w-8 h-8 text-[#C694F9] animate-spin" />
      </div>
      <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Loading Analytics…</p>
    </div>
  );
  if (error) return <div className="flex items-center justify-center min-h-[60vh] text-red-400 font-bold">{error}</div>;

  const last14 = daily.slice(-14);
  const chartValues = last14.map(d => chartTab === "dau" ? d.dau : chartTab === "volume" ? d.volume : d.transactions);
  const chartColor = chartTab === "dau" ? "#C694F9" : chartTab === "volume" ? "#facc15" : "#4ade80";

  const kpis = summary ? [
    { key: "Total Users",    value: summary.total_users,           icon: Users,      color: "#C694F9", pct: Math.min(100, Math.round((summary.total_users / 30) * 100)), sparkData: daily.slice(-14).map(d => d.dau), unit: "users",   sub: `${summary.active_users_30d} active 30d` },
    { key: "DAU (7d avg)",   value: summary.active_users_7d,       icon: Activity,   color: "#94A1F9", pct: Math.min(100, Math.round((summary.active_users_7d / Math.max(summary.total_users,1)) * 100)), sparkData: daily.slice(-14).map(d => d.dau), unit: "users", sub: `${Math.round(summary.retention_rate)}% retention` },
    { key: "Txns (30d)",     value: summary.transactions_30d,      icon: TrendingUp, color: "#4ade80", pct: Math.min(100, Math.round((summary.transactions_30d / Math.max(summary.total_transactions,1)) * 100)), sparkData: daily.slice(-14).map(d => d.transactions), unit: "txns", sub: `${summary.transactions_7d} this week` },
    { key: "Volume (30d)",   value: summary.volume_30d,            icon: BarChart2,  color: "#facc15", pct: 100, sparkData: daily.slice(-14).map(d => d.volume), unit: "XLM", sub: "Stellar testnet" },
    { key: "Retention",      value: summary.retention_rate,        icon: Calendar,   color: "#f87171", pct: summary.retention_rate, sparkData: [], unit: "%", sub: "Platform stickiness" },
    { key: "Gasless Txs ⚡", value: summary.gasless_transactions,  icon: Zap,        color: "#a78bfa", pct: Math.min(100, Math.round((summary.gasless_transactions / Math.max(summary.transactions_30d,1)) * 100)), sparkData: [], unit: "txns", sub: "Fee sponsored" },
    { key: "All-time Txns",  value: summary.total_transactions,    icon: ArrowUpRight,color:"#60a5fa", pct: 100, sparkData: daily.slice(-14).map(d => d.transactions), unit: "txns", sub: "Lifetime record" },
    { key: "Security Score", value: 62,                            icon: Shield,     color: "#34d399", pct: 62, sparkData: [], unit: "%", sub: "10/13 checks passed" },
  ] : [];

  return (
    <div className="space-y-7 pb-24" style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Analytics Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <Radio className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-semibold text-green-400">LIVE</span>
            </div>
          </div>
          <p className="text-white/30 text-xs font-medium">Updated {refreshed.toLocaleTimeString()} · ExpoPay Platform</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 text-white/70 hover:text-white">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* 8 KPI Cards — all collapsible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const isOpen = expanded === kpi.key;
          const detail = CARD_DETAILS[kpi.key];
          const barData = daily.slice(-14).map(d => ({
            date: d.date,
            value: kpi.key === "Volume (30d)" ? d.volume : kpi.key.includes("Txns") || kpi.key === "All-time Txns" ? d.transactions : d.dau
          }));
          return (
            <motion.div key={kpi.key} layout
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden cursor-pointer hover:border-white/15 transition-all"
              onClick={() => setExpanded(isOpen ? null : kpi.key)}>
              {/* Card Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}>
                      <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                    </div>
                    <p className="text-[11px] font-semibold text-white/50 leading-tight">{kpi.key}</p>
                  </div>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
                  </motion.div>
                </div>

                {/* Value */}
                <div className="flex items-end justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <p className="text-2xl font-bold text-white tabular-nums leading-none truncate">
                        {kpi.unit === "XLM"
                          ? kpi.value >= 1000
                            ? `${(kpi.value / 1000).toFixed(1)}K`
                            : kpi.value.toLocaleString()
                          : kpi.value.toLocaleString()}
                      </p>
                      {kpi.unit === "%" && <span className="text-lg text-white/50 font-bold">%</span>}
                      {kpi.unit === "XLM" && <span className="text-xs text-white/40 font-semibold">XLM</span>}
                    </div>
                    <p className="text-[10px] text-white/30 font-medium mt-1 truncate">{kpi.sub}</p>
                  </div>
                  {/* Ring */}
                  <div className="relative shrink-0">
                    <RingMini pct={kpi.pct} color={kpi.color} size={44} />
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold"
                      style={{ color: kpi.color }}>{kpi.pct}%</span>
                  </div>
                </div>

                {/* Sparkline */}
                {kpi.sparkData.length > 1 && (
                  <div className="mt-3 opacity-60">
                    <SparkLine data={kpi.sparkData} color={kpi.color} height={30} />
                  </div>
                )}
              </div>

              {/* Expanded Detail Panel */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                    onClick={e => e.stopPropagation()}>
                    <div className="px-4 pb-4 space-y-4 border-t border-white/[0.07] pt-4">
                      <p className="text-[11px] text-white/50 leading-relaxed">{detail.description}</p>

                      {/* Bar chart for data-backed metrics */}
                      {barData.some(d => d.value > 0) && (
                        <div>
                          <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-2">14-Day Trend</p>
                          <InteractiveBarChart data={barData} color={kpi.color}
                            label={kpi.unit === "XLM" ? "XLM" : kpi.unit === "%" ? "%" : kpi.key.toLowerCase().includes("user") ? "users" : "txns"} />
                        </div>
                      )}

                      {/* Retention breakdown */}
                      {kpi.key === "Retention" && summary && (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { l: "30d Active", v: summary.active_users_30d, c: "#C694F9" },
                            { l: "7d Active",  v: summary.active_users_7d,  c: "#4ade80" },
                            { l: "Total Users",v: summary.total_users,      c: "#facc15" },
                            { l: "Rate",       v: `${summary.retention_rate}%`, c: "#f87171" },
                          ].map(s => (
                            <div key={s.l} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                              <p className="text-[8px] text-white/30 uppercase tracking-wider">{s.l}</p>
                              <p className="text-sm font-bold mt-0.5" style={{color:s.c}}>{s.v}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Security breakdown */}
                      {kpi.key === "Security Score" && (
                        <div className="space-y-1.5">
                          {[
                            { l: "Server-side auth",      done: true },
                            { l: "Transaction PIN",       done: true },
                            { l: "Inactivity guard",      done: true },
                            { l: "On-chain audit trail",  done: true },
                            { l: "Structured logging",    done: true },
                            { l: "Fee-bump privacy",      done: true },
                            { l: "Duplicate tx check",    done: true },
                            { l: "Service key guard",     done: true },
                            { l: "PIN hashing (bcrypt)",  done: false },
                            { l: "Secret encryption",     done: false },
                            { l: "Rate limiting",         done: false },
                            { l: "DB role RBAC",          done: false },
                            { l: "Contract audit",        done: false },
                          ].map(c => (
                            <div key={c.l} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full shrink-0 ${c.done ? "bg-green-500" : "bg-white/10"}`} />
                              <span className={`text-[10px] font-medium ${c.done ? "text-white/70" : "text-white/25 line-through"}`}>{c.l}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tips */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest">Tips</p>
                        {detail.tips.map(t => (
                          <div key={t} className="flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{background:kpi.color}}/>
                            <p className="text-[10px] text-white/40">{t}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Main Interactive Chart */}
      <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4 border-b border-white/[0.05]">
          <div>
            <h2 className="text-sm font-bold text-white">Platform Trends</h2>
            <p className="text-[11px] text-white/30 font-medium mt-0.5">Last 14 days — hover bars for details</p>
          </div>
          <div className="flex gap-1.5">
            {(["dau","txns","volume"] as const).map(t => (
              <button key={t} onClick={() => setChartTab(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  chartTab === t
                    ? "text-white border" : "bg-white/[0.03] border border-white/[0.07] text-white/40 hover:text-white/70"}`}
                style={chartTab === t ? { background: `${chartColor}18`, borderColor: `${chartColor}40`, color: chartColor } : {}}>
                {t === "dau" ? "Users" : t === "volume" ? "Volume" : "Transactions"}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          <InteractiveBarChart
            data={last14.map((d, i) => ({ date: d.date, value: chartValues[i] ?? 0 }))}
            color={chartColor}
            label={chartTab === "volume" ? "XLM" : chartTab === "dau" ? "users" : "txns"} />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Users */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">🏆 Top Users · 30 Days</h3>
          {topUsers.length === 0
            ? <p className="text-white/20 text-sm text-center py-6">No transaction data yet</p>
            : <div className="space-y-2">
              {topUsers.map((u, i) => {
                const pct = topUsers[0]?.tx_count > 0 ? (u.tx_count / topUsers[0].tx_count) * 100 : 0;
                return (
                  <div key={u.universal_id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base w-5 shrink-0">{["🥇","🥈","🥉"][i] ?? `#${i+1}`}</span>
                      <span className="font-semibold text-sm text-[#C694F9] flex-1 truncate">{u.universal_id}@expo</span>
                      <span className="text-xs font-bold text-white/50 shrink-0">{u.tx_count} txs</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{background:`linear-gradient(to right, #C694F9, #94A1F9)`}}
                        initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:0.2+i*0.05,duration:0.8}} />
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>

        {/* Recent Signups */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">✨ Recent Signups</h3>
          {signups.length === 0
            ? <p className="text-white/20 text-sm text-center py-6">No signups yet</p>
            : <div className="space-y-2">
              {signups.map((u, i) => (
                <motion.div key={u.universal_id} initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{background:"#C694F9" + "22", border:"1px solid #C694F920", color:"#C694F9"}}>
                    {(u.full_name || u.universal_id || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-white">{u.full_name || u.universal_id}</p>
                    <p className="text-[10px] text-white/35 font-medium">{u.universal_id}@expo</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-white/35">{new Date(u.created_at).toLocaleDateString()}</p>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{background:"#C694F918",color:"#C694F9"}}>
                      {u.preferred_currency || "XLM"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}
