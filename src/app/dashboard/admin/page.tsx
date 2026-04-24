"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight,
  User,
  Clock,
  AlertTriangle,
  Scale
} from 'lucide-react';

interface DisputedContract {
  id: string;
  escrow_id: number;
  payer_universal_id: string;
  freelancer_universal_id: string;
  amount: number;
  currency: string;
  title: string;
  status: string;
  dispute_reason: string;
  disputed_by: 'payer' | 'freelancer';
  dispute_after_delivery: boolean;
  disputed_at: string;
}

export default function AdminDashboard() {
  const [contracts, setContracts] = useState<DisputedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDisputedContracts();
  }, []);

  const fetchDisputedContracts = async () => {
    try {
      const res = await fetch('/api/admin/contracts');
      if (!res.ok) throw new Error('Failed to fetch contracts');
      const data = await res.json();
      setContracts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (contractId: string, resolution: 'pay_freelancer' | 'refund_client') => {
    if (!confirm(`Are you sure you want to FORCE ${resolution === 'pay_freelancer' ? 'PAYMENT TO FREELANCER' : 'REFUND TO CLIENT'}? This action is irreversible.`)) return;
    
    setActionLoading(contractId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, resolution })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(data.message);
      // Remove resolved contract from list
      setContracts(prev => prev.filter(c => c.id !== contractId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const activeDisputes = contracts.filter(c => c.status === 'disputed');
  const resolvedDisputes = contracts.filter(c => c.status !== 'disputed');

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C694F9]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-syne)' }}>
            Arbiter <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C694F9] to-[#F5A7C4]">Console</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Review and force-resolve escalated escrow disputes.</p>
        </div>
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> GOD MODE ENABLED
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {activeDisputes.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center">
          <Scale className="w-12 h-12 text-white/20 mb-4" />
          <h3 className="text-xl font-bold mb-2">No Active Disputes</h3>
          <p className="text-zinc-500 text-sm">All escalated contracts have been resolved.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-red-400 mb-2">Active Escalations</h2>
          {activeDisputes.map((contract) => (
            <motion.div key={contract.id} className="glass-card rounded-2xl p-5 border border-red-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Scale className="w-32 h-32" />
              </div>
              
              <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{contract.title}</h3>
                    <p className="text-2xl font-black text-[#C694F9] mt-1">{contract.amount} {contract.currency}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <User className="w-3 h-3" /> Client: <span className="text-white">{contract.payer_universal_id}</span>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <User className="w-3 h-3" /> Freelancer: <span className="text-white">{contract.freelancer_universal_id}</span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${contract.disputed_by === 'payer' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        Raised by {contract.disputed_by}
                      </span>
                      {contract.dispute_after_delivery && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Bad-Faith Risk (Disputed after delivery)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 italic">&quot;{contract.dispute_reason}&quot;</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 justify-center min-w-[200px]">
                  <button
                    onClick={() => handleResolve(contract.id, 'pay_freelancer')}
                    disabled={actionLoading === contract.id}
                    className="w-full h-12 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading === contract.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Force Pay Freelancer
                  </button>
                  <button
                    onClick={() => handleResolve(contract.id, 'refund_client')}
                    disabled={actionLoading === contract.id}
                    className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading === contract.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Force Refund Client
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {resolvedDisputes.length > 0 && (
        <div className="space-y-4 mt-12 pt-8 border-t border-white/10">
          <h2 className="text-lg font-bold text-zinc-400 mb-2">Resolution History</h2>
          {resolvedDisputes.map((contract) => (
            <motion.div key={contract.id} className="glass-card rounded-2xl p-5 border border-white/5 opacity-70">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-md font-bold">{contract.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      contract.status === 'released' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {contract.status === 'released' ? 'Paid Freelancer' : 'Refunded Client'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <User className="w-3 h-3" /> {contract.payer_universal_id} <ArrowRight className="w-3 h-3" /> {contract.freelancer_universal_id}
                  </div>
                  <p className="text-xs text-zinc-500 italic mt-2">Dispute reason: &quot;{contract.dispute_reason}&quot;</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
