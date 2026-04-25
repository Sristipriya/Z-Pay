"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ArrowUpRight, ArrowDownLeft, QrCode, Scan, History, Loader2, ExternalLink, Zap, Shield, Wallet, ArrowRight, Store, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { PaySearch } from "@/components/PaySearch";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [convertedBalance, setConvertedBalance] = useState("0.00");
  const [xlmBalance, setXlmBalance] = useState("0.00");
  const [recentContacts, setRecentContacts] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, balanceRes, historyRes, merchantRes] = await Promise.all([
        fetch("/api/expo/profile"),
        fetch("/api/expo/balance"),
        fetch("/api/payments/history"),
        fetch("/api/merchant/history"),
      ]);

      // Only update profile if response is OK and has universal_id
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData?.universal_id) {
          setProfile(profileData);
        }
      }

      // Only update balance if response is OK and has xlm_balance
      let profileDataForContacts: any = null;
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        if (balanceData?.xlm_balance !== undefined) {
          setBalances(balanceData.balances || []);
          setConvertedBalance(balanceData.converted_balance || "0.00");
          setXlmBalance(balanceData.xlm_balance || "0.00");
        }
      }

      const [historyData, merchantData] = await Promise.all([
        historyRes.ok ? historyRes.json() : [],
        merchantRes.ok ? merchantRes.json() : [],
      ]);

      const p2pTx = Array.isArray(historyData)
        ? historyData.map((tx: any) => ({ ...tx, type: 'p2p' }))
        : [];
      const merchantTx = Array.isArray(merchantData)
        ? merchantData.map((tx: any) => ({
            ...tx,
            type: 'merchant',
            amount: tx.xlm_amount
          }))
        : [];

      const allTx = [...p2pTx, ...merchantTx]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      if (allTx.length > 0) {
        setTransactions(allTx);
      }

      // Build recent contacts from sent P2P transactions (unique recipients)
      setProfile((currentProfile: any) => {
        if (!currentProfile?.id) return currentProfile;
        const seen = new Set<string>();
        const contacts: any[] = [];
        for (const tx of p2pTx) {
          const uid = tx.sender_id === currentProfile.id
            ? tx.recipient_universal_id
            : null;
          if (uid && !seen.has(uid)) {
            seen.add(uid);
            contacts.push({
              username: uid,
              display_name: uid,
              last_paid_at: tx.created_at,
              currency: tx.currency || 'XLM',
            });
          }
        }
        setRecentContacts(contacts.slice(0, 8));
        return currentProfile;
      });

    } catch (err) {
      console.error("Fetch error:", err);
      // Do NOT reset state on error — keep showing last good values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'merchant_payments' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchData();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchData]);

  const copyToClipboard = () => {
    if (profile?.universal_id) {
      navigator.clipboard.writeText(`${profile.universal_id}@expo`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 sm:gap-6">
        <div className="relative">
          <Loader2 className="w-10 sm:w-12 h-10 sm:h-12 animate-spin text-[#C694F9]" />
          <div className="absolute inset-0 blur-lg bg-[#C694F9]/20 rounded-full" />
        </div>
        <p className="text-white/40 font-black tracking-widest uppercase text-[10px] sm:text-xs animate-pulse">Syncing with Stellar Network</p>
      </div>
    );
  }

    const preferredCurrency = profile?.preferred_currency || 'XLM';
    const displayBalance = preferredCurrency === 'XLM' 
      ? parseFloat(xlmBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : parseFloat(convertedBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const currencySymbols: Record<string, string> = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'USDC': '$',
      'XLM': ''
    };
    const currencySymbol = currencySymbols[preferredCurrency] || '';

  return (
    <div className="space-y-8 sm:space-y-10 pb-20">
      {/* ── Header ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-[clamp(2rem,8vw,4rem)] font-black tracking-tight mb-2 sm:mb-3 uppercase leading-[0.9]" style={{ fontFamily: 'var(--font-syne)' }}>
            OVERVIEW
          </h1>
          <div 
            onClick={copyToClipboard}
            className="group flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl w-fit cursor-pointer hover:bg-white/10 transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            <span className="text-[#C694F9] font-black text-sm sm:text-lg tracking-tight">{profile?.universal_id}@expo</span>
            <div className="h-3 sm:h-4 w-[1px] bg-white/10" />
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check">
                  <Check className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-green-500" />
                </motion.div>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy">
                  <Copy className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white/50 group-hover:text-white transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,1)] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-tight text-white/60">Stellar Testnet</span>
        </div>
      </section>

      {/* ── Google-Pay-style Search ── */}
      <section>
        <PaySearch recentContacts={recentContacts} />
      </section>

      {/* ── People (recent contacts) ── */}
      {recentContacts.length > 0 && (
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-4">People</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {recentContacts.map((p, i) => (
              <motion.a
                key={p.username}
                href={`/dashboard/send?to=${encodeURIComponent(p.username)}@expo`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-2 min-w-[64px] group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C694F9]/20 to-[#94A1F9]/20 border border-[#C694F9]/20 flex items-center justify-center font-black text-[#C694F9] text-xl uppercase transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(198,148,249,0.3)] group-active:scale-95">
                  {(p.display_name || p.username)[0]}
                </div>
                <span className="text-[10px] font-bold text-white/50 truncate w-16 text-center group-hover:text-white/80 transition-colors">
                  {p.display_name || p.username}
                </span>
              </motion.a>
            ))}
          </div>
        </section>
      )}
    

      <section>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C694F9] via-[#F5A7C4] to-[#94A1F9] rounded-[2rem] sm:rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500" />
            <div className="relative bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-5 sm:p-8 md:p-14 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-[#C694F9]/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 sm:w-96 h-64 sm:h-96 bg-[#94A1F9]/5 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 lg:gap-12">
                <div className="space-y-3 sm:space-y-4 min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-[#C694F9]">Available Balance</p>
                    <div className="flex items-baseline gap-2 sm:gap-4 flex-wrap">
                      <h2 className="text-[clamp(2.5rem,8vw,5rem)] font-black tracking-tight leading-none truncate" style={{ fontFamily: 'var(--font-syne)' }}>
                        {currencySymbol}{displayBalance}
                      </h2>
                      <span className="text-lg sm:text-xl md:text-3xl font-black text-white/30 tracking-widest shrink-0">{preferredCurrency}</span>
                    </div>
                    {preferredCurrency !== 'XLM' && (
                      <p className="text-xs text-white/40 font-medium">
                        ≈ {parseFloat(xlmBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM on Stellar
                      </p>
                    )}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-2 sm:pt-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-white/5 rounded-full border border-white/5 shrink-0">
                      <Zap className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-yellow-500" />
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">Instant Settlement</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-white/5 rounded-full border border-white/5 shrink-0">
                      <Shield className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-[#C694F9]" />
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">On-Chain Secured</span>
                    </div>
                  </div>
                </div>
  
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 sm:gap-4 w-full lg:w-auto lg:min-w-[240px] xl:min-w-[280px]">
                  <Link href="/dashboard/send" className="flex-1">
                    <Button className="w-full h-14 sm:h-16 xl:h-20 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] hover:opacity-90 text-white font-black text-base sm:text-lg xl:text-xl rounded-xl sm:rounded-2xl xl:rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-[#C694F9]/30 group">
                      SEND <ArrowUpRight className="ml-2 w-5 sm:w-6 h-5 sm:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/dashboard/receive" className="flex-1">
                    <Button className="w-full h-14 sm:h-16 xl:h-20 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-base sm:text-lg xl:text-xl rounded-xl sm:rounded-2xl xl:rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-xl group">
                      RECEIVE <ArrowDownLeft className="ml-2 w-5 sm:w-6 h-5 sm:h-6 group-hover:-translate-x-1 group-hover:translate-y-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <section className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between px-1 sm:px-2">
            <h3 className="text-lg sm:text-xl xl:text-2xl font-black tracking-tight uppercase" style={{ fontFamily: 'var(--font-syne)' }}>RECENT ACTIVITY</h3>
            <Link href="/dashboard/history" className="group flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              View all <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {transactions.length === 0 ? (
              <div className="p-8 sm:p-12 bg-white/[0.02] border border-white/[0.06] rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-4 border-dashed">
                <History className="w-8 sm:w-10 h-8 sm:h-10 text-white/20" />
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/30">No transactions yet</p>
              </div>
            ) : (
              transactions.map((tx, idx) => {
                  const isMerchant = tx.type === 'merchant';
                  const isReceived = !isMerchant && tx.recipient_id === profile?.id;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={tx.id}
                      className="group bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5 rounded-xl sm:rounded-2xl xl:rounded-3xl flex items-center justify-between hover:bg-white/[0.05] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 sm:gap-5">
                        <div className={cn(
                          "w-10 sm:w-12 xl:w-14 aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                          isMerchant 
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : isReceived 
                              ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                              : "bg-[#C694F9]/10 text-[#C694F9] border border-[#C694F9]/20"
                        )}>
                          {isMerchant ? <Store className="w-5 sm:w-6 xl:w-7 h-5 sm:h-6 xl:h-7" /> : isReceived ? <ArrowDownLeft className="w-5 sm:w-6 xl:w-7 h-5 sm:h-6 xl:h-7" /> : <ArrowUpRight className="w-5 sm:w-6 xl:w-7 h-5 sm:h-6 xl:h-7" />}
                        </div>
                        <div>
                          <p className="font-black text-sm sm:text-base xl:text-lg tracking-tight uppercase">
                            {isMerchant 
                              ? tx.merchant_name 
                              : isReceived 
                                ? (tx.sender_universal_id || 'UNKNOWN') 
                                : (tx.recipient_universal_id || 'UNKNOWN')}
                          </p>
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                            {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className="text-right">
                          {isMerchant ? (
                            <>
                              <p className="text-base sm:text-lg xl:text-xl font-black tracking-tight text-green-500">
                                ₹{parseFloat(tx.inr_amount?.toString() || '0').toLocaleString('en-IN')}
                              </p>
                              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                                {parseFloat(tx.xlm_amount?.toString() || '0').toFixed(2)} XLM
                              </p>
                            </>
                          ) : (
                            <>
                              <p className={cn("text-base sm:text-lg xl:text-xl font-black tracking-tight", isReceived ? "text-green-500" : "text-white")}>
                                {isReceived ? "+" : "-"}{tx.amount} <span className="text-[9px] sm:text-[10px] text-white/40 uppercase">{tx.currency || 'XLM'}</span>
                              </p>
                              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                                {tx.status}
                              </p>
                            </>
                          )}
                        </div>
                        <a 
                          href={`https://stellar.expert/explorer/testnet/tx/${tx.tx_hash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 sm:p-3 bg-white/5 rounded-lg sm:rounded-xl hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white/50" />
                        </a>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>
        </section>

          <section className="space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-xl xl:text-2xl font-black tracking-tight uppercase px-1 sm:px-2" style={{ fontFamily: 'var(--font-syne)' }}>QUICK ACTIONS</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <QuickActionCard 
                href="/dashboard/scan"
                icon={<Scan className="w-5 sm:w-6 h-5 sm:h-6" />}
                title="SCAN TO PAY"
                description="Quickly settle using a QR code"
                color="purple"
              />
              <QuickActionCard 
                href="/dashboard/merchant"
                icon={<Store className="w-5 sm:w-6 h-5 sm:h-6" />}
                title="PAY MERCHANT (UPI)"
                description="Pay any UPI QR with testnet crypto"
                color="pink"
              />
              <QuickActionCard 
                href="/dashboard/receive"
                icon={<QrCode className="w-5 sm:w-6 h-5 sm:h-6" />}
                title="MY IDENTITY"
                description="Show your Universal QR"
                color="blue"
              />
<QuickActionCard 
                    href="/dashboard/profile"
                    icon={<Wallet className="w-5 sm:w-6 h-5 sm:h-6" />}
                    title="WALLET SECURITY"
                    description="Manage your keys and backup"
                    color="purple"
                  />
                  <QuickActionCard 
                    href="/dashboard/contracts"
                    icon={<FileText className="w-5 sm:w-6 h-5 sm:h-6" />}
                    title="CONTRACTS"
                    description="Escrow-based secure payments"
                    color="blue"
                  />
                </div>
          </section>
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon, title, description, color }: any) {
  const colors: any = {
    purple: "text-[#C694F9] bg-[#C694F9]/10 border-[#C694F9]/20",
    pink: "text-[#F5A7C4] bg-[#F5A7C4]/10 border-[#F5A7C4]/20",
    blue: "text-[#94A1F9] bg-[#94A1F9]/10 border-[#94A1F9]/20"
  };

  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ scale: 1.02, x: 5 }}
        whileActive={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className="bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5 xl:p-6 rounded-xl sm:rounded-[1.5rem] xl:rounded-[2rem] flex items-center gap-4 sm:gap-5 group hover:bg-white/[0.05] transition-all"
      >
        <div className={cn("w-10 sm:w-12 xl:w-14 aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110", colors[color])}>
          {icon}
        </div>
        <div>
          <h4 className="font-black tracking-tight uppercase text-sm sm:text-base" style={{ fontFamily: 'var(--font-syne)' }}>{title}</h4>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/50 transition-colors">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
}
