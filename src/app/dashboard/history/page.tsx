"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Search, Loader2, History, Calendar, Globe, Store, IndianRupee } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Transaction {
  id: string;
  type: 'p2p' | 'merchant';
  sender_id?: string;
  recipient_id?: string;
  sender_universal_id?: string;
  recipient_universal_id?: string;
  merchant_name?: string;
  merchant_upi_id?: string;
  amount: number;
  currency?: string;
  inr_amount?: number;
  xlm_amount?: number;
  status: string;
  tx_hash: string;
  created_at: string;
  note?: string;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantPayments, setMerchantPayments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'p2p' | 'merchant'>('all');

    const fetchData = useCallback(async () => {
      try {
        const [profileRes, historyRes, merchantRes] = await Promise.all([
          fetch("/api/expo/profile"),
          fetch("/api/payments/history"),
          fetch("/api/merchant/history"),
        ]);
        const profileData = await profileRes.json();
        const historyData = await historyRes.json();
        const merchantData = await merchantRes.json();
        
        console.log('P2P history response:', historyData);
        console.log('Merchant history response:', merchantData);
        
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
        
        console.log('P2P transactions:', p2pTx.length);
        console.log('Merchant transactions:', merchantTx.length);
        
        const allTx = [...p2pTx, ...merchantTx].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setProfile(profileData);
        setTransactions(allTx);
      } catch (err) {
        console.error('Fetch data error:', err);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('history-transactions')
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

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.type === filter;
    const matchesSearch = 
      tx.sender_universal_id?.toLowerCase().includes(search.toLowerCase()) ||
      tx.recipient_universal_id?.toLowerCase().includes(search.toLowerCase()) ||
      tx.merchant_name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.merchant_upi_id?.toLowerCase().includes(search.toLowerCase()) ||
      tx.amount?.toString().includes(search);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="text-zinc-500 font-black tracking-widest uppercase text-xs animate-pulse">Retrieving Ledger History</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-none">
            HISTORY
          </h1>
          <p className="text-zinc-500 font-medium text-lg">Immutable proof of global transactions</p>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
          <Input 
            placeholder="Search routing history..." 
            className="pl-14 h-14 bg-white/5 border-white/10 rounded-2xl focus:border-blue-500/50 transition-all font-bold tracking-tight"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'p2p', 'merchant'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all",
              filter === f 
                ? "bg-white text-black" 
                : "bg-white/5 text-zinc-500 hover:bg-white/10"
            )}
          >
            {f === 'all' ? 'All' : f === 'p2p' ? 'User to User' : 'Merchant'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredTransactions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 glass-card rounded-[2.5rem] border-dashed flex flex-col items-center gap-6"
            >
              <History className="w-16 h-16 text-zinc-800" />
              <div className="space-y-1">
                <p className="text-xl font-black uppercase tracking-tight text-zinc-600">No records found</p>
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-800">Initiate a payment to see it here</p>
              </div>
            </motion.div>
          ) : (
            filteredTransactions.map((tx, index) => {
              const isReceived = tx.type === 'p2p' && tx.recipient_id === profile?.id;
              const isMerchant = tx.type === 'merchant';
              
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="group glass-card p-6 md:p-8 rounded-[2rem] flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex items-center gap-6 md:gap-8 relative z-10">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-transform group-hover:scale-110",
                      isMerchant 
                        ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                        : isReceived 
                          ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]" 
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                    )}>
                      {isMerchant ? (
                        <Store className="w-8 h-8" />
                      ) : isReceived ? (
                        <ArrowDownLeft className="w-8 h-8" />
                      ) : (
                        <ArrowUpRight className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">
                          {isMerchant 
                            ? tx.merchant_name 
                            : isReceived 
                              ? (tx.sender_universal_id || 'EXTERNAL') 
                              : (tx.recipient_universal_id || 'EXTERNAL')
                          }
                        </span>
                        <div className="h-1 w-1 bg-zinc-700 rounded-full" />
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em]",
                          isMerchant ? "text-green-500" : "text-blue-500"
                        )}>
                          {isMerchant ? 'UPI' : '@expo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {isMerchant && tx.merchant_upi_id && (
                          <span className="text-[10px] font-bold text-zinc-600 truncate max-w-[150px]">
                            {tx.merchant_upi_id}
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {format(new Date(tx.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Globe className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:gap-8 relative z-10 min-w-0">
                    <div className="text-right shrink-0">
                      {isMerchant ? (
                        <>
                          <p className="text-2xl md:text-3xl font-black tracking-tighter leading-none mb-1 text-green-500">
                            ₹{parseFloat(tx.inr_amount?.toString() || '0').toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-black">
                            {parseFloat(tx.xlm_amount?.toString() || '0').toFixed(2)} XLM spent
                          </p>
                        </>
                        ) : (
                            <>
                              <p className={cn("text-2xl md:text-3xl font-black tracking-tighter leading-none mb-1 break-all", isReceived ? "text-green-500" : "text-white")}>
                                {isReceived ? "+" : "-"}{tx.amount} <span className="text-xs text-zinc-500 uppercase tracking-widest shrink-0">{tx.currency || 'XLM'}</span>
                              </p>
                              {tx.note && tx.note.startsWith('XLM:') && (
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-black">
                                  {tx.note.replace('XLM:', '')} XLM on-chain
                                </p>
                              )}
                              {(!tx.note || !tx.note.startsWith('XLM:')) && (
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-black">
                                  Confirmed on Ledger
                                </p>
                              )}
                            </>
                          )}
                    </div>
                    <motion.a 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={`https://stellar.expert/explorer/testnet/tx/${tx.tx_hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-4 bg-white/5 rounded-2xl hover:bg-white/20 text-zinc-500 hover:text-white transition-all shadow-xl border border-white/5"
                    >
                      <ExternalLink className="w-6 h-6" />
                    </motion.a>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/0 to-blue-500/0 group-hover:via-blue-500/5 transition-all duration-500" />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
