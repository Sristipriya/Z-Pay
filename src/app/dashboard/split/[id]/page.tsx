"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, Users, ExternalLink, Loader2, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

export default function SplitDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  const fetchSplit = async () => {
    const res = await fetch(`/api/split/${id}`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSplit(); }, [id]);

  const handlePay = async () => {
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`/api/split/${id}/pay`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) { setError(result.error || "Payment failed"); return; }
      setPaid(true);
      setTimeout(() => fetchSplit(), 1500);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#C694F9]" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-20">
      <p className="text-white/40 font-bold">Split not found</p>
      <Link href="/dashboard/split" className="text-[#C694F9] text-sm font-black mt-4 inline-block">← Back to Splits</Link>
    </div>
  );

  const { split, isCreator, currentUserId } = data;
  const participants: any[] = split.split_participants || [];
  const paidCount = participants.filter((p: any) => p.status === 'paid').length;
  const totalCount = participants.length;
  const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const myEntry = participants.find((p: any) => p.user_id === currentUserId);
  const iHavePaid = myEntry?.status === 'paid' || paid;
  const amIParticipant = !!myEntry;
  const collectedSoFar = participants
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount_owed), 0);

  return (
    <div className="max-w-lg mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight">{split.title}</h1>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Created {format(new Date(split.created_at), 'MMM d, yyyy')}
            {" · "}
            <span className={cn(
              split.status === 'completed' ? "text-green-400" : "text-[#C694F9]"
            )}>
              {split.status}
            </span>
          </p>
        </div>
      </div>

      {/* Confetti for completed */}
      <AnimatePresence>
        {split.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/30 rounded-3xl p-5 flex items-center gap-4"
          >
            <PartyPopper className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="font-black text-green-400 text-sm uppercase tracking-wider">All Settled! 🎉</p>
              <p className="text-white/50 text-xs mt-0.5">Everyone has paid their share.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl overflow-hidden">
        {/* Amount header */}
        <div className="p-6 bg-gradient-to-br from-[#C694F9]/5 to-[#94A1F9]/5 border-b border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Total Bill</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{split.total_amount}</span>
            <span className="text-white/30 font-black">{split.currency}</span>
          </div>
          {split.note && <p className="text-white/40 text-sm mt-2">{split.note}</p>}

          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-bold text-white/40">
              <span>{paidCount}/{totalCount} paid</span>
              <span className="text-[#C694F9]">{collectedSoFar.toFixed(2)} / {split.total_amount} {split.currency}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "h-full rounded-full",
                  progress === 100
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-[#C694F9] to-[#94A1F9]"
                )}
              />
            </div>
          </div>
        </div>

        {/* Participants list */}
        <div className="divide-y divide-white/5">
          {participants
            .sort((a, b) => (b.status === 'paid' ? 1 : 0) - (a.status === 'paid' ? 1 : 0))
            .map((p: any, i: number) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black border",
                    p.status === 'paid'
                      ? "bg-green-500/10 border-green-500/20 text-green-400"
                      : "bg-white/5 border-white/10 text-white/50"
                  )}>
                    {p.universal_id[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-sm">@{p.universal_id}</p>
                    {p.status === 'paid' && p.paid_at && (
                      <p className="text-[10px] text-white/30 font-bold mt-0.5">
                        Paid {format(new Date(p.paid_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-sm">{parseFloat(p.amount_owed).toFixed(2)}</span>
                  <div className="flex items-center gap-1">
                    {p.status === 'paid' ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        {p.tx_hash && (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${p.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-white/20 hover:text-white/60 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </span>
                    ) : (
                      <Clock className="w-5 h-5 text-white/20" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Pay button for participants */}
      <AnimatePresence>
        {!isCreator && amIParticipant && !iHavePaid && split.status === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            <div className="bg-[#C694F9]/5 border border-[#C694F9]/20 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Your Share</p>
                <p className="font-black text-2xl text-[#C694F9] mt-0.5">
                  {parseFloat(myEntry?.amount_owed || 0).toFixed(2)}
                  <span className="text-xs text-white/30 ml-1">{split.currency}</span>
                </p>
              </div>
              <Users className="w-8 h-8 text-[#C694F9]/30" />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3"
              >
                <p className="text-red-400 text-sm font-bold">{error}</p>
              </motion.div>
            )}

            <button
              id="split-pay-btn"
              onClick={handlePay}
              disabled={paying}
              className="w-full h-16 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black uppercase tracking-wider text-lg shadow-2xl shadow-[#C694F9]/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {paying ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Paying on Stellar...</>
              ) : (
                <>Pay {parseFloat(myEntry?.amount_owed || 0).toFixed(2)} {split.currency} →</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Already paid state */}
      {!isCreator && amIParticipant && iHavePaid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/10 border border-green-500/30 rounded-2xl px-5 py-5 flex items-center gap-4"
        >
          <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
          <div>
            <p className="font-black text-green-400 uppercase tracking-wider text-sm">Your payment is confirmed ✓</p>
            <p className="text-white/40 text-xs mt-0.5">Transaction recorded on Stellar blockchain</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
