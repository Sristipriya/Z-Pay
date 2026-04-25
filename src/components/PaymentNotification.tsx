"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, FileText, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface PaymentNotificationProps {
  currentUserId: string;
  currentUniversalId: string;
}

// ─── Toast builder ────────────────────────────────────────────────────────────
function makeToast(opts: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  headline: string;
  sub: string;
  accentColor?: string;
}) {
  const { icon, iconBg, label, headline, sub } = opts;
  return (t: string | number) => (
    <motion.div
      initial={{ opacity: 0, y: -60, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className="w-[calc(100vw-2rem)] max-w-sm mx-auto"
    >
      <div className="relative bg-[#0d0d0d] border border-[#C694F9]/30 rounded-2xl p-4 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C694F9] via-[#F5A7C4] to-[#94A1F9]" />
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 shrink-0 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
            <p className="font-black text-white text-base leading-tight">{headline}</p>
            <p className="text-xs text-white/50 mt-0.5 truncate">{sub}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function PaymentNotification({ currentUserId, currentUniversalId }: PaymentNotificationProps) {
  const txChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const contractChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─── P2P payment received ───────────────────────────────────────────────────
  const showPaymentToast = useCallback((tx: any) => {
    const amount = parseFloat(tx.amount || "0").toFixed(2);
    const currency = tx.currency || "XLM";
    const sender = tx.sender_universal_id || "Someone";

    toast.custom(
      makeToast({
        icon: <ArrowDownLeft className="w-5 h-5 text-green-400" />,
        iconBg: "bg-green-500/15 border border-green-500/25",
        label: "Payment Received",
        headline: `+${amount} ${currency}`,
        sub: `from ${sender}@expo`,
      }),
      { duration: 7000, position: "top-center" }
    );
  }, []);

  // ─── Escrow contract update ─────────────────────────────────────────────────
  const showContractToast = useCallback((contract: any, isFreelancer: boolean) => {
    const status: string = contract.status || "";
    const title: string = contract.title || "Contract";
    const amount = parseFloat(contract.amount || "0").toFixed(2);
    const currency = contract.currency || "XLM";

    type ToastConfig = {
      icon: React.ReactNode;
      iconBg: string;
      label: string;
      headline: string;
      sub: string;
    };

    const configs: Record<string, ToastConfig> = {
      funded: {
        icon: <FileText className="w-5 h-5 text-[#C694F9]" />,
        iconBg: "bg-[#C694F9]/15 border border-[#C694F9]/25",
        label: "New Contract",
        headline: `${amount} ${currency} in escrow`,
        sub: title,
      },
      delivered: {
        icon: <CheckCircle2 className="w-5 h-5 text-amber-400" />,
        iconBg: "bg-amber-500/15 border border-amber-500/25",
        label: "Work Delivered",
        headline: "Review & Release Funds",
        sub: title,
      },
      released: {
        icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
        iconBg: "bg-green-500/15 border border-green-500/25",
        label: "Funds Released",
        headline: `+${amount} ${currency}`,
        sub: title,
      },
      disputed: {
        icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
        iconBg: "bg-red-500/15 border border-red-500/25",
        label: "Dispute Raised",
        headline: "Contract Under Review",
        sub: title,
      },
      refunded: {
        icon: <CheckCircle2 className="w-5 h-5 text-blue-400" />,
        iconBg: "bg-blue-500/15 border border-blue-500/25",
        label: "Refund Processed",
        headline: `+${amount} ${currency} returned`,
        sub: title,
      },
    };

    const cfg = configs[status];
    if (!cfg) return;

    toast.custom(makeToast(cfg), { duration: 8000, position: "top-center" });
  }, []);

  useEffect(() => {
    if (!currentUserId || !currentUniversalId) return;

    // ── P2P incoming payments ──────────────────────────────────────────────────
    const txChannel = supabase
      .channel(`incoming-payments-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => showPaymentToast(payload.new)
      )
      .subscribe();

    // ── Escrow contract changes (as payer OR freelancer) ───────────────────────
    const contractChannel = supabase
      .channel(`contracts-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contracts",
          filter: `freelancer_id=eq.${currentUserId}`,
        },
        (payload) => showContractToast(payload.new, true)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contracts",
          filter: `payer_id=eq.${currentUserId}`,
        },
        (payload) => {
          // Payer only cares about delivery and dispute events
          const status = payload.new?.status;
          if (status === "delivered" || status === "disputed") {
            showContractToast(payload.new, false);
          }
        }
      )
      .subscribe();

    txChannelRef.current = txChannel;
    contractChannelRef.current = contractChannel;

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(contractChannel);
    };
  }, [currentUserId, currentUniversalId, showPaymentToast, showContractToast]);

  return null;
}
