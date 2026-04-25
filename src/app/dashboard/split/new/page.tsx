"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, X, ArrowLeft, Loader2, Equal, Sliders, Zap, CheckCircle2, Search, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Participant = {
  universal_id: string;
  amount_owed: string;
  avatar_url?: string | null;
  display_name?: string;
  resolved?: boolean;
};

function UserAvatar({ url, name, size = 10 }: { url?: string | null; name: string; size?: number }) {
  const dim = `w-${size} h-${size}`;
  return (
    <div
      className={cn(dim, "shrink-0 rounded-xl flex items-center justify-center font-black text-sm uppercase overflow-hidden bg-cover bg-center border")}
      style={{
        backgroundImage: url ? `url(${url})` : undefined,
        background: url ? undefined : "linear-gradient(135deg, rgba(198,148,249,0.25), rgba(148,161,249,0.15))",
        borderColor: url ? "rgba(255,255,255,0.1)" : "rgba(198,148,249,0.3)",
        color: "#C694F9",
      }}
    >
      {!url && (name[0]?.toUpperCase() || "?")}
    </div>
  );
}

export default function NewSplitPage() {
  const router = useRouter();
  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [title, setTitle]         = useState("");
  const [note, setNote]           = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency]                = useState("XLM");
  const [participants, setParticipants] = useState<Participant[]>([{ universal_id: "", amount_owed: "" }]);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [resolving, setResolving] = useState<number | null>(null);
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const resolveUser = useCallback(async (i: number, val: string) => {
    const clean = val.replace("@expo", "").trim();
    if (!clean || clean.length < 2) return;
    setResolving(i);
    try {
      const res = await fetch(`/api/expo/resolve?username=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(prev => prev.map((p, idx) => idx === i ? {
          ...p,
          universal_id: data.username || clean,
          display_name: data.display_name || data.full_name || data.username || clean,
          avatar_url:   data.avatar_url || null,
          resolved:     true,
        } : p));
      }
    } catch {}
    finally { setResolving(null); }
  }, []);

  const handleParticipantInput = (i: number, value: string) => {
    const updated = [...participants];
    updated[i] = { ...updated[i], universal_id: value, resolved: false, avatar_url: null, display_name: undefined };
    setParticipants(updated);
    if (debounceRefs.current[i]) clearTimeout(debounceRefs.current[i]);
    debounceRefs.current[i] = setTimeout(() => resolveUser(i, value), 500);
  };

  const addParticipant    = () => setParticipants([...participants, { universal_id: "", amount_owed: "" }]);
  const removeParticipant = (i: number) => setParticipants(participants.filter((_, idx) => idx !== i));

  const updateAmount = (i: number, value: string) => {
    const updated = [...participants];
    updated[i] = { ...updated[i], amount_owed: value };
    setParticipants(updated);
  };

  const distributeEqually = () => {
    const total = parseFloat(totalAmount);
    if (!total || participants.length === 0) return;
    const share = (total / participants.length).toFixed(7);
    setParticipants(prev => prev.map(p => ({ ...p, amount_owed: share })));
  };

  const handleStep1 = () => {
    if (!title.trim()) { setError("Please enter a title"); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { setError("Enter a valid amount"); return; }
    setError(""); setStep(2);
  };

  const handleStep2 = () => {
    const valid = participants.every(p => p.universal_id.trim());
    if (!valid || participants.length === 0) { setError("Add at least one participant with a valid @expo ID"); return; }
    if (splitType === "equal") distributeEqually();
    setError(""); setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    const totalOwed = participants.reduce((s, p) => s + parseFloat(p.amount_owed || "0"), 0);
    const total = parseFloat(totalAmount);
    if (Math.abs(totalOwed - total) > 0.01) {
      setError(`Amounts don't add up. Total owed: ${totalOwed.toFixed(2)}, Bill total: ${total}`);
      setLoading(false); return;
    }
    try {
      const res = await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, note,
          total_amount: total,
          currency,
          participants: participants.map(p => ({
            universal_id: p.universal_id.replace("@expo", "").trim(),
            amount_owed:  parseFloat(p.amount_owed),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create split"); return; }
      router.push(`/dashboard/split/${data.split.id}`);
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  };

  const perPerson = totalAmount && participants.length > 0
    ? (parseFloat(totalAmount) / participants.length).toFixed(2)
    : "0.00";

  const STEPS = ["Bill Details", "Add People", "Review & Send"];

  return (
    <div className="max-w-lg mx-auto pb-24 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => step === 1 ? router.back() : setStep(step === 3 ? 2 : 1)}
          className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <Users className="w-4 h-4 text-[#C694F9]" />
            <h1 className="text-xl font-black uppercase tracking-tight" style={{ fontFamily: 'var(--font-syne)' }}>
              Split Bill
            </h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">{STEPS[step - 1]}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Step</p>
          <p className="text-2xl font-black text-[#C694F9]">{step}<span className="text-white/20 text-sm">/3</span></p>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex-1 relative h-1 bg-white/[0.06] rounded-full overflow-hidden">
            {s <= step && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-full"
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Step 1: Bill Details ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-5">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C694F9]/5 rounded-full blur-3xl" />

              <div className="space-y-2 relative z-10">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35 block">What&apos;s the bill for?</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Dinner at Punjab Grill, Road trip fuel…"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 font-bold text-base focus:outline-none focus:border-[#C694F9]/40 focus:bg-white/[0.07] placeholder:text-white/15 transition-all"
                />
              </div>

              <div className="space-y-2 relative z-10">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35 block">Total Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={e => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 font-black text-4xl focus:outline-none focus:border-[#C694F9]/40 focus:bg-white/[0.07] placeholder:text-white/10 transition-all pr-24"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-right">
                    <p className="font-black text-sm text-white/30">XLM</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35 block">Note <span className="text-white/15">(optional)</span></label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note…"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3 font-medium text-sm focus:outline-none focus:border-[#C694F9]/40 placeholder:text-white/15 transition-all"
                />
              </div>
            </div>

            {error && <ErrorBox message={error} />}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleStep1}
              className="w-full h-16 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-[#C694F9]/25 flex items-center justify-center gap-2"
            >
              Continue <span className="text-white/60">→</span>
            </motion.button>
          </motion.div>
        )}

        {/* ── Step 2: Add People ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">

            {/* Split type toggle */}
            <div className="relative flex p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              {(["equal", "custom"] as const).map(type => (
                <button key={type} onClick={() => setSplitType(type)}
                  className="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all">
                  {splitType === type && (
                    <motion.div layoutId="split-type" className="absolute inset-0 bg-gradient-to-r from-[#C694F9]/20 to-[#94A1F9]/10 rounded-xl border border-[#C694F9]/30"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
                  )}
                  <span className={cn("relative z-10 flex items-center gap-2 transition-colors", splitType === type ? "text-[#C694F9]" : "text-white/30")}>
                    {type === "equal" ? <Equal className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
                    {type === "equal" ? "Equal" : "Custom"}
                  </span>
                </button>
              ))}
            </div>

            {splitType === "equal" && totalAmount && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between bg-[#C694F9]/5 border border-[#C694F9]/15 rounded-2xl px-5 py-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Each person pays</p>
                  <p className="font-black text-2xl text-[#C694F9] mt-0.5">{perPerson} <span className="text-sm text-white/30">XLM</span></p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#C694F9]/10 border border-[#C694F9]/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#C694F9]" />
                </div>
              </motion.div>
            )}

            {/* Participants */}
            <div className="space-y-3">
              {participants.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 items-center">
                  <div className={cn(
                    "flex-1 bg-white/[0.03] border rounded-2xl px-4 py-3 flex items-center gap-3 transition-all",
                    p.resolved ? "border-[#C694F9]/30 bg-[#C694F9]/5" : "border-white/[0.08] focus-within:border-[#C694F9]/30"
                  )}>
                    {resolving === i ? (
                      <Loader2 className="w-8 h-8 text-[#C694F9] animate-spin shrink-0" />
                    ) : p.resolved && p.avatar_url ? (
                      <UserAvatar url={p.avatar_url} name={p.display_name || p.universal_id} />
                    ) : p.resolved ? (
                      <UserAvatar url={null} name={p.display_name || p.universal_id} />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/30">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#C694F9]/60 font-black text-sm">@</span>
                        <input
                          value={p.universal_id}
                          onChange={e => handleParticipantInput(i, e.target.value)}
                          placeholder="expoId"
                          className="bg-transparent flex-1 font-bold text-sm focus:outline-none placeholder:text-white/15 min-w-0"
                        />
                      </div>
                      {p.resolved && p.display_name && (
                        <p className="text-[10px] text-white/40 font-medium flex items-center gap-1 mt-0.5">
                          <BadgeCheck className="w-3 h-3 text-blue-400" /> {p.display_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {splitType === "custom" && (
                    <div className="w-28 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3 py-3 flex items-center gap-1 focus-within:border-[#C694F9]/30 transition-all">
                      <input
                        type="number"
                        value={p.amount_owed}
                        onChange={e => updateAmount(i, e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent w-full font-bold text-sm focus:outline-none placeholder:text-white/15"
                      />
                      <span className="text-white/25 text-[10px] font-black shrink-0">XLM</span>
                    </div>
                  )}

                  {participants.length > 1 && (
                    <button onClick={() => removeParticipant(i)}
                      className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400 transition-all shrink-0 text-white/30">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            <button onClick={addParticipant}
              className="w-full h-12 bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl font-black text-sm uppercase tracking-wider text-white/25 hover:text-white/60 hover:bg-white/[0.05] hover:border-white/20 transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Person
            </button>

            {error && <ErrorBox message={error} />}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleStep2}
              className="w-full h-16 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-[#C694F9]/25 flex items-center justify-center gap-2">
              Review Split <span className="text-white/60">→</span>
            </motion.button>
          </motion.div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">

            <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-5">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] opacity-60" />

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-xl">{title}</h3>
                  {note && <p className="text-white/40 text-sm mt-1">{note}</p>}
                </div>
                <div className="text-right">
                  <p className="font-black text-2xl text-[#C694F9]">{totalAmount}</p>
                  <p className="text-[10px] text-white/30 font-black uppercase">XLM</p>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Split Between</p>
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar url={p.avatar_url} name={p.display_name || p.universal_id} />
                      <div>
                        <p className="font-bold text-sm">@{p.universal_id.replace("@expo", "")}</p>
                        {p.display_name && <p className="text-[10px] text-white/30">{p.display_name}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{parseFloat(p.amount_owed).toFixed(2)}</p>
                      <p className="text-[9px] text-white/30">XLM</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">You collect</span>
                </div>
                <span className="font-black text-lg text-green-400">{totalAmount} XLM</span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl px-4 py-3">
              <span className="text-amber-400 shrink-0">⚠️</span>
              <p className="text-[10px] font-medium text-amber-400/60 leading-relaxed">
                Requests will be sent to all participants instantly. On-chain transactions (Stellar Testnet) are irreversible.
              </p>
            </div>

            {error && <ErrorBox message={error} />}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSubmit} disabled={loading}
              className="w-full h-16 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-[#C694F9]/25 disabled:opacity-50 flex items-center justify-center gap-3">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending Requests…</> : <><Zap className="w-5 h-5" /> Send Split Requests</>}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3">
      <span className="text-red-400 shrink-0 mt-0.5">✕</span>
      <p className="text-red-400 text-sm font-bold">{message}</p>
    </motion.div>
  );
}
