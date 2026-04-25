"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Plus, Search, Loader2, CheckCircle2, XCircle, 
  AlertTriangle, DollarSign, Clock, Shield, BadgeCheck,
  Lock, Package, ArrowRight, ExternalLink, Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Contract {
  id: string;
  escrow_id: number;
  payer_id: string;
  freelancer_id: string;
  payer_universal_id: string;
  freelancer_universal_id: string;
  amount: number;
  currency: string;
  title: string;
  description?: string;
  status: string;
  expiry_timestamp: number;
  created_at: string;
  funded_at?: string;
  delivered_at?: string;
  released_at?: string;
  disputed_at?: string;
  refunded_at?: string;
  dispute_reason?: string;
  disputed_by?: 'payer' | 'freelancer';
  dispute_after_delivery?: boolean;
  tx_hash_create?: string;
  tx_hash_release?: string;
  tx_hash_refund?: string;
  tx_hash_dispute?: string;
}

function PinModal({ isOpen, onClose, onSubmit, loading, title }: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  loading: boolean;
  title: string;
}) {
  const [pin, setPin] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-[#C694F9]/20 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-[#C694F9]" />
          </div>
          <h2 className="text-2xl font-black uppercase">{title}</h2>
          <p className="text-zinc-500 text-sm">Enter PIN to authorize</p>
        </div>

        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map((index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={pin[index]}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-2xl font-black bg-white/5 border-2 border-white/10 rounded-xl focus:border-[#C694F9] focus:outline-none"
              disabled={loading}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-14 border-white/10 rounded-xl font-bold" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(pin.join(''))}
            disabled={loading || pin.some(d => d === '')}
            className="flex-1 h-14 bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-black rounded-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DisputeModal({ isOpen, onClose, onSubmit, loading }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black uppercase">Raise Dispute</h2>
          <p className="text-zinc-500 text-sm">This will freeze the contract until resolved</p>
        </div>

        <textarea
          placeholder="Describe the issue in detail..."
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm resize-none focus:border-red-500 focus:outline-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-14 border-white/10 rounded-xl font-bold" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(reason)}
            disabled={loading || reason.length < 10}
            className="flex-1 h-14 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Dispute'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [freelancerUsername, setFreelancerUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [actionType, setActionType] = useState<'release' | 'refund'>('release');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      const [contractsRes, profileRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/expo/profile')
      ]);
      const contractsData = await contractsRes.json();
      const profileData = await profileRes.json();
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      setProfile(profileData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const resolveRecipient = useCallback(async (username: string) => {
    const cleanUsername = username.replace('@expo', '').trim();
    if (!cleanUsername) {
      setReceiverProfile(null);
      return;
    }
    setResolving(true);
    try {
      const res = await fetch(`/api/expo/resolve?username=${cleanUsername}`);
      if (res.ok) {
        const data = await res.json();
        setReceiverProfile(data);
      } else {
        setReceiverProfile(null);
      }
    } catch {
      setReceiverProfile(null);
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (freelancerUsername) resolveRecipient(freelancerUsername);
    }, 500);
    return () => clearTimeout(timer);
  }, [freelancerUsername, resolveRecipient]);

  const handleCreate = async () => {
    if (!freelancerUsername || !amount || !title) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freelancer_username: freelancerUsername,
          amount,
          title,
          description: description || undefined,
          expiry_days: parseInt(expiryDays),
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Contract created on Stellar!');
        setShowCreate(false);
        setFreelancerUsername('');
        setAmount('');
        setTitle('');
        setDescription('');
        setReceiverProfile(null);
        fetchContracts();
      }
    } catch {
      toast.error('Failed to create contract');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (pin: string) => {
    if (!selectedContract) return;
    setActionLoading(true);
    try {
      const endpoint = actionType === 'release' ? '/api/contracts/release' : '/api/contracts/refund';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: selectedContract.id,
          pin: pin || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message);
        setShowPinModal(false);
        setSelectedContract(null);
        fetchContracts();
      }
    } catch {
      toast.error(`Failed to ${actionType} contract`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async (contractId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/contracts/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message);
        fetchContracts();
      }
    } catch {
      toast.error('Failed to mark as delivered');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async (reason: string) => {
    if (!selectedContract) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/contracts/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: selectedContract.id,
          reason,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message);
        setShowDisputeModal(false);
        setSelectedContract(null);
        fetchContracts();
      }
    } catch {
      toast.error('Failed to raise dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-blue-500/20 text-blue-400';
      case 'funded': return 'bg-amber-500/20 text-amber-400';
      case 'delivered': return 'bg-purple-500/20 text-purple-400';
      case 'released': return 'bg-green-500/20 text-green-400';
      case 'disputed': return 'bg-red-500/20 text-red-400';
      case 'refunded': return 'bg-zinc-500/20 text-zinc-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created': return <FileText className="w-5 h-5" />;
      case 'funded': return <DollarSign className="w-5 h-5" />;
      case 'delivered': return <Package className="w-5 h-5" />;
      case 'released': return <CheckCircle2 className="w-5 h-5" />;
      case 'disputed': return <AlertTriangle className="w-5 h-5" />;
      case 'refunded': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#C694F9]" />
        <p className="text-zinc-500 font-black text-xs uppercase tracking-widest">Loading Contracts</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase mb-2">CONTRACTS</h1>
          <p className="text-zinc-500">Escrow-based payments secured on Stellar blockchain</p>
        </div>
        <Button 
          onClick={() => setShowCreate(!showCreate)}
          className="h-14 w-full md:w-auto bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-black rounded-xl gap-2"
        >
          <Plus className="w-5 h-5" /> New Contract
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 p-4 glass-card rounded-2xl">
        <div className="text-center">
          <p className="text-2xl font-black text-[#C694F9]">{contracts.filter(c => c.status === 'released').length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Completed</p>
        </div>
        <div className="text-center border-x border-white/10">
          <p className="text-2xl font-black text-amber-400">{contracts.filter(c => ['funded', 'delivered'].includes(c.status)).length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Active</p>
        </div>
        <div className="text-center border-r border-white/10">
          <p className="text-2xl font-black text-red-400">{contracts.filter(c => c.status === 'disputed').length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Disputed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-zinc-400">{contracts.filter(c => c.status === 'refunded').length}</p>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Refunded</p>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 md:p-8 rounded-[2rem] space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#C694F9]/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#C694F9]" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase">New Escrow Contract</h2>
                  <p className="text-xs text-zinc-500">Funds held securely until work is delivered</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Freelancer / Recipient</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                    <Input
                      placeholder="username@expo"
                      className="bg-white/5 border-white/10 pl-12 h-14 rounded-xl"
                      value={freelancerUsername}
                      onChange={(e) => setFreelancerUsername(e.target.value)}
                    />
                    {resolving && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-zinc-500" />}
                  </div>
                  {receiverProfile && (
                    <div className="flex items-center gap-3 p-3 bg-[#C694F9]/10 rounded-xl border border-[#C694F9]/20">
                      <div className="w-10 h-10 bg-[#C694F9]/20 rounded-lg flex items-center justify-center font-black text-[#C694F9]">
                        {receiverProfile.display_name?.[0] || receiverProfile.username?.[0]}
                      </div>
                      <div>
                        <p className="font-bold flex items-center gap-2">
                          {receiverProfile.display_name || receiverProfile.username}
                          <BadgeCheck className="w-4 h-4 text-blue-500" />
                        </p>
                        <p className="text-xs text-zinc-500">{receiverProfile.username}@expo</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contract Title</label>
                  <Input
                    placeholder="e.g., Website Redesign Project"
                    className="bg-white/5 border-white/10 h-14 rounded-xl"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount (XLM)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="bg-white/5 border-white/10 h-14 text-xl font-black pr-16 rounded-xl"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">XLM</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Expiry (Days)</label>
                    <Input
                      type="number"
                      placeholder="30"
                      className="bg-white/5 border-white/10 h-14 text-xl font-black rounded-xl"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description (Optional)</label>
                  <textarea
                    placeholder="Describe the work to be done..."
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm resize-none focus:border-[#C694F9] focus:outline-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                  <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-blue-400">How Escrow Works</p>
                      <ol className="text-blue-500/70 list-decimal list-inside space-y-1 mt-2">
                        <li>You create and fund the contract (XLM locked on-chain)</li>
                        <li>Freelancer completes work and marks as delivered</li>
                        <li>You approve and release funds to freelancer</li>
                        <li>Or dispute to freeze funds and request refund</li>
                      </ol>
                    </div>
                  </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreate(false)}
                    className="w-full sm:flex-1 h-14 border-white/10 rounded-xl font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate}
                    disabled={creating || !freelancerUsername || !amount || !title}
                    className="w-full sm:flex-1 h-14 bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-black rounded-xl"
                  >
                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create & Fund Contract'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <h3 className="text-lg font-black uppercase text-zinc-400">Your Contracts</h3>
        
        {contracts.length === 0 ? (
          <div className="glass-card p-12 rounded-[2rem] text-center space-y-4">
            <Briefcase className="w-12 h-12 mx-auto text-zinc-700" />
            <p className="text-zinc-500 font-bold">No contracts yet</p>
            <p className="text-xs text-zinc-600">Create your first escrow contract above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => {
              const isPayer = contract.payer_id === profile?.id;
              const isFreelancer = contract.freelancer_id === profile?.id;
              
              return (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 rounded-2xl space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", getStatusColor(contract.status))}>
                        {getStatusIcon(contract.status)}
                      </div>
                      <div>
                        <p className="font-black text-lg">{contract.title}</p>
                        <p className="text-sm text-zinc-500">
                          {isPayer ? `To: ${contract.freelancer_universal_id}@expo` : `From: ${contract.payer_universal_id}@expo`}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Created {format(new Date(contract.created_at), 'MMM d, yyyy')}
                          {contract.expiry_timestamp && ` • Expires ${format(new Date(contract.expiry_timestamp * 1000), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">{contract.amount} {contract.currency}</p>
                      <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full", getStatusColor(contract.status))}>
                        {contract.status}
                      </span>
                    </div>
                  </div>

                  {contract.description && (
                    <p className="text-sm text-zinc-400 border-t border-white/5 pt-3">{contract.description}</p>
                  )}

                  {contract.dispute_reason && contract.status === 'disputed' && (
                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                      <p className="text-xs text-red-400 font-bold uppercase mb-1">Dispute Reason</p>
                      <p className="text-sm text-red-300">{contract.dispute_reason}</p>
                    </div>
                  )}

                  {/* Arbiter Resolved Banners */}
                  {contract.disputed_by && contract.status === 'released' && (
                    <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-xs text-green-400">
                      <p className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Dispute Resolved</p>
                      <p className="text-green-500/70">The Arbiter reviewed this dispute and forced the release of funds to the freelancer.</p>
                      <p className="text-green-500/50 mt-1 italic">&quot;{contract.dispute_reason}&quot;</p>
                    </div>
                  )}
                  {contract.disputed_by && contract.status === 'refunded' && (
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs text-blue-400">
                      <p className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Dispute Resolved</p>
                      <p className="text-blue-500/70">The Arbiter reviewed this dispute and refunded the funds back to the client.</p>
                      <p className="text-blue-500/50 mt-1 italic">&quot;{contract.dispute_reason}&quot;</p>
                    </div>
                  )}

                    {/* ── 48h warning + auto-release countdown for freelancer ── */}
                    {isFreelancer && contract.status === 'delivered' && contract.delivered_at && (
                      (() => {
                        const msElapsed = Date.now() - new Date(contract.delivered_at).getTime();
                        const hoursElapsed = msElapsed / 36e5;
                        const daysElapsed  = msElapsed / 864e5;
                        const autoReleaseDays = 7;
                        const daysLeft = Math.max(0, autoReleaseDays - daysElapsed);
                        return (
                          <div className={`p-3 rounded-xl border text-xs ${
                            daysElapsed >= autoReleaseDays
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {daysElapsed >= autoReleaseDays ? (
                              <>
                                <p className="font-bold mb-1">✅ Auto-release available!</p>
                                <p className="text-green-500/70">Client didn&apos;t respond in {autoReleaseDays} days. You can now claim your payment automatically.</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold mb-1">⏳ {Math.floor(hoursElapsed)}h elapsed &mdash; Auto-release in {Math.ceil(daysLeft * 24)}h</p>
                                <p className="text-amber-500/70">If client doesn&apos;t approve in {Math.ceil(daysLeft)} day{Math.ceil(daysLeft) !== 1 ? 's' : ''}, you can auto-claim your payment. Or dispute now.</p>
                              </>
                            )}
                          </div>
                        );
                      })()
                    )}

                    {/* ── Bad-faith warning for payer who disputed after delivery ── */}
                    {isPayer && contract.status === 'disputed' && contract.dispute_after_delivery && (
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 text-xs text-orange-400">
                        <p className="font-bold mb-1">⚠️ Arbiter review required</p>
                        <p className="text-orange-500/70">
                          You disputed this contract after the freelancer had already delivered the work.
                          Self-refund is blocked to prevent abuse. Contact{' '}
                          <a href="mailto:support@expopay.app" className="underline">support@expopay.app</a>
                          {' '}with your evidence.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {/* FREELANCER: auto-release after 7 days (no dispute needed) */}
                      {isFreelancer && contract.status === 'delivered' && contract.delivered_at && (
                        (() => {
                          const daysElapsed = (Date.now() - new Date(contract.delivered_at).getTime()) / 864e5;
                          return daysElapsed >= 7 ? (
                            <Button
                              onClick={() => { setSelectedContract(contract); setActionType('refund'); handleAction(''); }}
                              disabled={actionLoading}
                              className="h-10 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Auto-Release Payment
                            </Button>
                          ) : null;
                        })()
                      )}

                      {/* FREELANCER: mark as delivered */}
                      {isFreelancer && contract.status === 'funded' && (
                        <Button
                          onClick={() => handleDeliver(contract.id)}
                          disabled={actionLoading}
                          className="h-10 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg gap-2"
                        >
                          <Package className="w-4 h-4" /> Mark Delivered
                        </Button>
                      )}

                      {/* FREELANCER: dispute if client ghosts after delivery */}
                      {isFreelancer && contract.status === 'delivered' && (
                        <Button
                          onClick={() => { setSelectedContract(contract); setShowDisputeModal(true); }}
                          variant="outline"
                          disabled={actionLoading}
                          className="h-10 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold rounded-lg gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" /> Client Not Paying? Dispute
                        </Button>
                      )}

                      {/* FREELANCER: claim funds after they raised the dispute */}
                      {isFreelancer && contract.status === 'disputed' && contract.disputed_by === 'freelancer' && (
                        <Button
                          onClick={() => { setSelectedContract(contract); setActionType('refund'); handleAction(''); }}
                          disabled={actionLoading}
                          className="h-10 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg gap-2"
                        >
                          <DollarSign className="w-4 h-4" /> Claim Payment
                        </Button>
                      )}

                      {/* FREELANCER: waiting for arbiter if payer disputed */}
                      {isFreelancer && contract.status === 'disputed' && contract.disputed_by === 'payer' && (
                        <span className="h-10 px-3 flex items-center text-xs text-zinc-500 border border-white/5 rounded-lg gap-2">
                          <Shield className="w-3 h-3" /> Awaiting Arbiter Review
                        </span>
                      )}

                      {/* PAYER: approve and release funds */}
                      {isPayer && (contract.status === 'delivered' || contract.status === 'funded') && (
                        <Button
                          onClick={() => {
                            setSelectedContract(contract);
                            setActionType('release');
                            if (profile?.app_pin) { setShowPinModal(true); } else { handleAction(''); }
                          }}
                          disabled={actionLoading}
                          className="h-10 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve & Release
                        </Button>
                      )}

                      {/* PAYER: refund — only if THEY disputed AND it was BEFORE delivery */}
                      {isPayer && contract.status === 'disputed' &&
                        contract.disputed_by === 'payer' &&
                        !contract.dispute_after_delivery && (
                        <Button
                          onClick={() => {
                            setSelectedContract(contract);
                            setActionType('refund');
                            if (profile?.app_pin) { setShowPinModal(true); } else { handleAction(''); }
                          }}
                          disabled={actionLoading}
                          className="h-10 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg gap-2"
                        >
                          <DollarSign className="w-4 h-4" /> Request Refund
                        </Button>
                      )}

                      {/* PAYER: disputed after delivery → arbiter only, no refund button */}
                      {isPayer && contract.status === 'disputed' &&
                        contract.disputed_by === 'payer' &&
                        contract.dispute_after_delivery && (
                        <span className="h-10 px-3 flex items-center text-xs text-orange-400 border border-orange-500/20 rounded-lg gap-2 bg-orange-500/10">
                          <Shield className="w-3 h-3" /> Arbiter review required — cannot self-refund
                        </span>
                      )}

                      {/* PAYER: freelancer raised dispute — wait for arbiter */}
                      {isPayer && contract.status === 'disputed' && contract.disputed_by === 'freelancer' && (
                        <span className="h-10 px-3 flex items-center text-xs text-amber-400 border border-amber-500/20 rounded-lg gap-2 bg-amber-500/10">
                          <AlertTriangle className="w-3 h-3" /> Freelancer raised a dispute — awaiting arbiter
                        </span>
                      )}

                      {/* PAYER: raise dispute */}
                      {isPayer && !['released', 'refunded', 'disputed'].includes(contract.status) && (
                        <Button
                          onClick={() => { setSelectedContract(contract); setShowDisputeModal(true); }}
                          variant="outline"
                          className="h-10 border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold rounded-lg gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" /> Dispute
                        </Button>
                      )}

                      {/* View on-chain */}
                      {(contract.tx_hash_release || contract.tx_hash_dispute || contract.tx_hash_create) && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${contract.tx_hash_release || contract.tx_hash_dispute || contract.tx_hash_create}`}
                          target="_blank" rel="noopener noreferrer"
                          className="h-10 px-4 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg"
                        >
                          <ExternalLink className="w-3 h-3" /> View on Stellar
                        </a>
                      )}

                      {contract.escrow_id > 0 && (
                        <span className="h-10 px-3 flex items-center text-xs text-zinc-500 border border-white/5 rounded-lg">
                          Escrow #{contract.escrow_id}
                        </span>
                      )}
                    </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPinModal && (
          <PinModal
            isOpen={showPinModal}
            onClose={() => { setShowPinModal(false); setSelectedContract(null); }}
            onSubmit={handleAction}
            loading={actionLoading}
              title={actionType === 'release' ? 'Release Funds' : 'Request Refund'}
          />
        )}
        {showDisputeModal && (
          <DisputeModal
            isOpen={showDisputeModal}
            onClose={() => { setShowDisputeModal(false); setSelectedContract(null); }}
            onSubmit={handleDispute}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
