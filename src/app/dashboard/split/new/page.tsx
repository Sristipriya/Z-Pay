"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, X, ArrowLeft, Loader2, Equal, Sliders, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Participant = { universal_id: string; amount_owed: string };

export default function NewSplitPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency] = useState("XLM");
  const [participants, setParticipants] = useState<Participant[]>([{ universal_id: "", amount_owed: "" }]);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userInput, setUserInput] = useState("");

  const addParticipant = () => {
    setParticipants([...participants, { universal_id: "", amount_owed: "" }]);
  };

  const removeParticipant = (i: number) => {
    setParticipants(participants.filter((_, idx) => idx !== i));
  };

  const updateParticipant = (i: number, field: keyof Participant, value: string) => {
    const updated = [...participants];
    updated[i][field] = value;
    setParticipants(updated);
  };

  const distributeEqually = () => {
    const total = parseFloat(totalAmount);
    if (!total || participants.length === 0) return;
    const share = (total / participants.length).toFixed(7);
    setParticipants(participants.map(p => ({ ...p, amount_owed: share })));
  };

  const handleStep1 = () => {
    if (!title.trim()) { setError("Please enter a title"); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { setError("Enter a valid amount"); return; }
    setError("");
    setStep(2);
  };

  const handleStep2 = () => {
    const valid = participants.every(p => p.universal_id.trim());
    if (!valid || participants.length === 0) { setError("Add at least one participant with a valid @expo ID"); return; }
    if (splitType === "equal") distributeEqually();
    setError("");
    setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    // Validate amounts
    const totalOwed = participants.reduce((sum, p) => sum + parseFloat(p.amount_owed || "0"), 0);
    const total = parseFloat(totalAmount);
    if (Math.abs(totalOwed - total) > 0.01) {
      setError(`Amounts don't add up. Total owed: ${totalOwed.toFixed(2)}, Bill total: ${total}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          note,
          total_amount: total,
          currency,
          participants: participants.map(p => ({
            universal_id: p.universal_id.replace("@expo", "").trim(),
            amount_owed: parseFloat(p.amount_owed),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create split"); return; }
      router.push(`/dashboard/split/${data.split.id}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => step === 1 ? router.back() : setStep(step === 3 ? 2 : 1)}
          className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ fontFamily: 'var(--font-syne)' }}>
            New Split
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={cn(
            "h-1 rounded-full flex-1 transition-all duration-500",
            s <= step ? "bg-gradient-to-r from-[#C694F9] to-[#94A1F9]" : "bg-white/10"
          )} />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* Step 1: Bill details */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight mb-6">What's the bill for?</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                    Bill Title *
                  </label>
                  <input
                    id="split-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Dinner at Barbeque Nation, Road trip fuel..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 font-bold text-base focus:outline-none focus:border-[#C694F9]/50 focus:bg-white/[0.07] placeholder:text-white/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                    Total Amount (XLM) *
                  </label>
                  <div className="relative">
                    <input
                      id="split-amount"
                      type="number"
                      value={totalAmount}
                      onChange={e => setTotalAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 font-black text-3xl focus:outline-none focus:border-[#C694F9]/50 focus:bg-white/[0.07] placeholder:text-white/10 transition-all pr-20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-white/30 text-sm">XLM</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">
                    Note (optional)
                  </label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Dinner at Barbeque Nation, Saturday night..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 font-medium text-sm focus:outline-none focus:border-[#C694F9]/50 placeholder:text-white/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && <ErrorBox message={error} />}

            <button
              id="split-next-1"
              onClick={handleStep1}
              className="w-full h-14 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-[#C694F9]/30 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Continue →
            </button>
          </motion.div>
        )}

        {/* Step 2: Add people */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-black uppercase tracking-tight">Who's splitting?</h2>

            {/* Split type toggle */}
            <div className="flex gap-3">
              {(["equal", "custom"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSplitType(type)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm uppercase tracking-wider border transition-all",
                    splitType === type
                      ? "bg-[#C694F9]/10 border-[#C694F9]/30 text-[#C694F9]"
                      : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                  )}
                >
                  {type === "equal" ? <Equal className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
                  {type === "equal" ? "Equal Split" : "Custom"}
                </button>
              ))}
            </div>

            {splitType === "equal" && totalAmount && (
              <div className="bg-[#C694F9]/5 border border-[#C694F9]/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-white/60 font-bold">Each person pays</span>
                <span className="font-black text-[#C694F9]">
                  {(parseFloat(totalAmount) / (participants.length || 1)).toFixed(2)} XLM
                </span>
              </div>
            )}

            <div className="space-y-3">
              {participants.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-center"
                >
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-[#C694F9]/40 transition-all">
                    <span className="text-[#C694F9] font-black text-sm shrink-0">@</span>
                    <input
                      value={p.universal_id}
                      onChange={e => updateParticipant(i, "universal_id", e.target.value)}
                      placeholder="expoId"
                      className="bg-transparent flex-1 font-bold text-sm focus:outline-none placeholder:text-white/20"
                    />
                  </div>
                  {splitType === "custom" && (
                    <div className="w-28 bg-white/5 border border-white/10 rounded-2xl px-3 py-3 flex items-center gap-1 focus-within:border-[#C694F9]/40 transition-all">
                      <input
                        type="number"
                        value={p.amount_owed}
                        onChange={e => updateParticipant(i, "amount_owed", e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent w-full font-bold text-sm focus:outline-none placeholder:text-white/20"
                      />
                      <span className="text-white/30 text-[10px] font-bold shrink-0">XLM</span>
                    </div>
                  )}
                  {participants.length > 1 && (
                    <button
                      onClick={() => removeParticipant(i)}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            <button
              onClick={addParticipant}
              className="w-full h-12 bg-white/5 border border-white/10 border-dashed rounded-2xl font-black text-sm uppercase tracking-wider text-white/40 hover:text-white hover:bg-white/[0.07] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Person
            </button>

            {error && <ErrorBox message={error} />}

            <button
              id="split-next-2"
              onClick={handleStep2}
              className="w-full h-14 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-[#C694F9]/30 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Review Split →
            </button>
          </motion.div>
        )}

        {/* Step 3: Review & confirm */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-black uppercase tracking-tight">Review & Send</h2>

            {/* Summary card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-xl">{title}</h3>
                  {note && <p className="text-white/40 text-sm mt-1">{note}</p>}
                </div>
                <span className="font-black text-2xl text-[#C694F9]">{totalAmount} <span className="text-xs text-white/30">XLM</span></span>
              </div>

              <div className="h-px bg-white/5" />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Participants</p>
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white/80">@{p.universal_id.replace("@expo", "")}</span>
                    <span className="font-black text-sm">{parseFloat(p.amount_owed).toFixed(2)} XLM</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-white/5" />

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">You collect</span>
                <span className="font-black text-lg text-green-400">{totalAmount} XLM</span>
              </div>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-yellow-400/80 leading-relaxed">
                ⚠️ Requests will be sent to all participants instantly. Payments are on-chain (Stellar Testnet) and are irreversible.
              </p>
            </div>

            {error && <ErrorBox message={error} />}

            <button
              id="split-submit"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-base shadow-2xl shadow-[#C694F9]/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Creating Split...</>
              ) : (
                <>🚀 Send Split Requests</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3"
    >
      <p className="text-red-400 text-sm font-bold">{message}</p>
    </motion.div>
  );
}
