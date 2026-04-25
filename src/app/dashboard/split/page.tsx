"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Users, Plus, ArrowRight, CheckCircle2, Clock, XCircle, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SplitPage() {
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/expo/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setCurrentUserId(d.id); });

    fetch("/api/split")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setSplits(Array.isArray(data) ? data : []); })
      .finally(() => setLoading(false));
  }, []);

  const activeSplits = splits.filter(s => s.status === 'active');
  const pastSplits = splits.filter(s => s.status !== 'active');

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-[clamp(2rem,8vw,3.5rem)] font-black tracking-tight uppercase leading-[0.9]"
            style={{ fontFamily: 'var(--font-syne)' }}>
            SPLIT
          </h1>
          <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-2">
            Split bills with your group
          </p>
        </div>
        <Link href="/dashboard/split/new">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl shadow-[#C694F9]/30"
          >
            <Plus className="w-4 h-4" />
            New Split
          </motion.button>
        </Link>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#C694F9]" />
          <p className="text-white/30 text-xs font-black uppercase tracking-widest">Loading splits...</p>
        </div>
      ) : splits.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {activeSplits.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Active ({activeSplits.length})
              </h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {activeSplits.map((split, i) => (
                    <SplitCard key={split.id} split={split} index={i} currentUserId={currentUserId} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {pastSplits.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                Completed
              </h3>
              <div className="space-y-3">
                {pastSplits.map((split, i) => (
                  <SplitCard key={split.id} split={split} index={i} currentUserId={currentUserId} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SplitCard({ split, index, currentUserId }: any) {
  const participants: any[] = split.split_participants || [];
  const paidCount = participants.filter((p: any) => p.status === 'paid').length;
  const totalCount = participants.length;
  const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const isCreator = split.creator_id === currentUserId;
  const myEntry = participants.find((p: any) => p.user_id === currentUserId);
  const iHavePaid = myEntry?.status === 'paid';
  const amIParticipant = !!myEntry;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/dashboard/split/${split.id}`}>
        <motion.div
          whileHover={{ scale: 1.01, x: 3 }}
          className="group bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 rounded-2xl p-5 transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 shrink-0",
                split.status === 'completed'
                  ? "bg-green-500/10 border-green-500/20 text-green-500"
                  : "bg-[#C694F9]/10 border-[#C694F9]/20 text-[#C694F9]"
              )}>
                {split.status === 'completed'
                  ? <CheckCircle2 className="w-6 h-6" />
                  : <Users className="w-6 h-6" />
                }
              </div>
              <div>
                <h4 className="font-black text-base tracking-tight">{split.title}</h4>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-0.5">
                  {isCreator ? "You created" : `${split.creator_universal_id}@expo`}
                  {" · "}
                  {format(new Date(split.created_at), 'MMM d')}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="font-black text-lg tracking-tight">
                {split.total_amount} <span className="text-white/30 text-xs">{split.currency}</span>
              </p>
              {!isCreator && amIParticipant && myEntry && (
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                  iHavePaid
                    ? "text-green-400 bg-green-500/10"
                    : "text-[#C694F9] bg-[#C694F9]/10"
                )}>
                  {iHavePaid ? "✓ Paid" : `You owe ${myEntry.amount_owed} ${split.currency}`}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                {paidCount}/{totalCount} paid
              </span>
              {split.status === 'active' && !isCreator && !iHavePaid && (
                <span className="text-[10px] font-black text-[#C694F9] uppercase tracking-wider flex items-center gap-1">
                  Tap to pay <ArrowRight className="w-3 h-3" />
                </span>
              )}
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "h-full rounded-full",
                  progress === 100
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-[#C694F9] to-[#94A1F9]"
                )}
              />
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-6 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-[#C694F9]/10 border border-[#C694F9]/20 flex items-center justify-center">
        <Receipt className="w-10 h-10 text-[#C694F9]/60" />
      </div>
      <div>
        <h3 className="font-black text-xl uppercase tracking-tight">No Splits Yet</h3>
        <p className="text-white/40 text-sm mt-2 max-w-xs">
          Split a dinner, trip, or any shared expense with your group. Everyone pays their share on-chain.
        </p>
      </div>
      <Link href="/dashboard/split/new">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl shadow-[#C694F9]/30"
        >
          <Plus className="w-4 h-4" />
          Create your first split
        </motion.button>
      </Link>
    </motion.div>
  );
}
