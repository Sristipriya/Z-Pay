"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Loader2, CheckCircle2, XCircle, ArrowRight, ExternalLink, 
  Zap, Shield, Globe, BadgeCheck, Clock, RefreshCw, Lock, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReceiverProfile {
  username: string;
  address: string;
  display_name: string;
  full_name?: string;
  avatar_url?: string | null;
  preferred_currency: string;
  verified: boolean;
}

interface FxQuote {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source_amount: number;
  target_amount: number;
  expires_at: string;
  seconds_remaining: number;
}

function PinModal({ isOpen, onClose, onSubmit, loading, receiver, quote, pinError }: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  loading: boolean;
  receiver: ReceiverProfile | null;
  quote: FxQuote | null;
  pinError: string;
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

  const handleSubmit = () => {
    const fullPin = pin.join('');
    if (fullPin.length === 4) {
      onSubmit(fullPin);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Clear PIN when there's an error so user can re-enter
  useEffect(() => {
    if (pinError) {
      setPin(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [pinError]);

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
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-[#C694F9]/20 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-[#C694F9]" />
          </div>
          <h2 className="text-2xl font-black uppercase">Confirm Payment</h2>
          <p className="text-zinc-500 text-sm">Enter your 4-digit PIN to authorize</p>
        </div>

        {receiver && quote && (
          <div className="p-4 bg-white/5 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 bg-[#C694F9]/20 rounded-xl flex items-center justify-center font-black text-[#C694F9] bg-cover bg-center overflow-hidden"
                style={{ backgroundImage: receiver.avatar_url ? `url(${receiver.avatar_url})` : undefined }}
              >
                {!receiver.avatar_url && (receiver.display_name?.[0] || receiver.username[0])}
              </div>
              <div>
                <p className="font-bold flex items-center gap-2">
                  {receiver.display_name || receiver.username}
                  {receiver.verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                </p>
                <p className="text-xs text-zinc-500">{receiver.username}@expo</p>
              </div>
            </div>
            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
              <span className="text-zinc-500 text-sm">Amount</span>
              <div className="text-right">
                <p className="font-black">{quote.source_amount} {quote.from_currency}</p>
                <p className="text-xs text-zinc-500">→ {quote.target_amount.toFixed(2)} {quote.to_currency}</p>
              </div>
            </div>
          </div>
        )}

        {pinError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-sm font-bold"
          >
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {pinError}
          </motion.div>
        )}

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
              className={cn(
                "w-14 h-14 text-center text-2xl font-black bg-white/5 border-2 rounded-xl focus:outline-none transition-colors",
                pinError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#C694F9]"
              )}
              disabled={loading}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-14 border-white/10 rounded-xl font-bold" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
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

function SendForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [recipient, setRecipient] = useState(searchParams.get("to") || "");
  const [amount, setAmount] = useState(searchParams.get("amount") || "");
  const [note, setNote] = useState(searchParams.get("note") || "");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [receiverProfile, setReceiverProfile] = useState<ReceiverProfile | null>(null);
  const [resolving, setResolving] = useState(false);
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [pinError, setPinError] = useState("");
  const [senderCurrency, setSenderCurrency] = useState("USDC");
  const [useGasless, setUseGasless] = useState(false);

  useEffect(() => {
    fetch("/api/expo/profile")
      .then(res => res.json())
      .then(data => {
        setHasPin(!!data.app_pin);
        setSenderCurrency(data.preferred_currency || "USDC");
      })
      .catch(() => {});
  }, []);

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
        setReceiverProfile({
          username: data.username || cleanUsername,
          address: data.address,
          display_name: data.display_name || data.full_name || cleanUsername,
          full_name: data.full_name,
          avatar_url: data.avatar_url || null,
          preferred_currency: data.preferred_currency || 'USDC',
          verified: true,
        });
        setError("");
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
      if (recipient) resolveRecipient(recipient);
    }, 500);
    return () => clearTimeout(timer);
  }, [recipient, resolveRecipient]);

  const generateQuote = useCallback(async () => {
    if (!receiverProfile || !amount || parseFloat(amount) <= 0) return;
    setQuoteLoading(true);
    try {
      const res = await fetch("/api/fx/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_currency: senderCurrency,
          to_currency: receiverProfile.preferred_currency,
          amount: parseFloat(amount),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
        setCountdown(data.seconds_remaining);
      }
    } catch {
      setError("Failed to generate quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [receiverProfile, amount, senderCurrency]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (receiverProfile && amount && parseFloat(amount) > 0) {
        generateQuote();
      } else {
        setQuote(null);
        setCountdown(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [receiverProfile, amount, generateQuote]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          setQuote(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleInitiateSend = () => {
    setPinError("");
    if (hasPin) {
      setShowPinModal(true);
    } else {
      handleSend("");
    }
  };

  const handleSend = async (pin: string) => {
    if (!quote) {
      setError("Please wait for a valid quote");
      return;
    }
    setLoading(true);
    setError("");
    setPinError("");

    try {
      const res = await fetch(useGasless ? "/api/payments/gasless" : "/api/payments/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: recipient.includes('@expo') ? recipient : `${recipient}@expo`,
          amount: quote.source_amount.toString(),
          currency: senderCurrency,
          note,
          purpose: purpose || note || undefined,
          pin: pin || undefined,
        }),
      });
      const data = await res.json();

      if (data.error) {
        // Check if it's a PIN-related error
        if (data.error.toLowerCase().includes("pin")) {
          setPinError(data.error);
          // Keep modal open for PIN errors
        } else {
          setError(data.error);
          setStatus("error");
          setShowPinModal(false);
        }
      } else {
        setTxHash(data.tx_hash);
          setPaymentResult({
            ...data,
            amount_sent: quote.source_amount,
            amount_received: quote.target_amount,
            from_currency: quote.from_currency,
            to_currency: quote.to_currency,
            recipient_name: receiverProfile?.display_name || recipient,
          });
          setStatus("success");
          setShowPinModal(false);
          toast.success(`Sent ${quote.source_amount} ${senderCurrency} to ${receiverProfile?.display_name || recipient}`);
      }
    } catch {
      setError("Failed to process payment");
      setStatus("error");
      setShowPinModal(false);
    } finally {
      setLoading(false);
    }
  };

  if (status === "success" && paymentResult) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-10 glass-card relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C694F9] to-green-500" />
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative"
        >
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </motion.div>
        <h2 className="text-4xl font-black tracking-tight mb-4 uppercase">PAYMENT SENT</h2>
        <div className="max-w-sm mx-auto space-y-4 mb-8">
          <div className="p-4 bg-white/5 rounded-2xl">
            <p className="text-zinc-500 text-sm mb-1">You sent</p>
            <p className="text-3xl font-black">{paymentResult.amount_sent} {paymentResult.from_currency}</p>
          </div>
          {paymentResult.from_currency !== paymentResult.to_currency && (
            <div className="p-4 bg-[#C694F9]/10 rounded-2xl border border-[#C694F9]/20">
              <p className="text-zinc-400 text-sm mb-1">{paymentResult.recipient_name} receives</p>
              <p className="text-3xl font-black text-[#C694F9]">~{paymentResult.amount_received?.toFixed(2)} {paymentResult.to_currency}</p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <a 
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-zinc-500 hover:text-[#C694F9] transition-all font-bold text-sm bg-white/5 py-4 rounded-xl border border-white/5"
          >
            VIEW ON EXPLORER <ExternalLink className="w-4 h-4" />
          </a>
          <Button
            onClick={() => {
              // Reset form state and stay on send page with recipient pre-filled
              setStatus("idle");
              setError("");
              setAmount("");
              setNote("");
              setQuote(null);
              setPaymentResult(null);
            }}
            className="w-full h-14 bg-[#C694F9]/15 hover:bg-[#C694F9]/25 border border-[#C694F9]/30 text-[#C694F9] font-black text-base rounded-2xl transition-all"
          >
            PAY AGAIN
          </Button>
          <Button onClick={() => router.push("/dashboard")} className="w-full h-14 bg-white text-black hover:bg-zinc-200 text-base font-black rounded-2xl">
            RETURN TO OVERVIEW
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-none">SEND MONEY</h1>
        <p className="text-zinc-500 font-medium text-lg">Global settlement via universal routing</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden">
        <div className="space-y-8 relative z-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Universal Identity</label>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-600" />
              <Input
                placeholder="username@expo"
                className="bg-white/5 border-white/10 pl-14 h-16 text-xl font-bold rounded-2xl focus:border-[#C694F9]/50"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              {resolving && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-zinc-500" />}
            </div>
          </div>

          <AnimatePresence>
            {receiverProfile && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="p-5 bg-[#C694F9]/10 rounded-2xl border border-[#C694F9]/20 space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 bg-[#C694F9]/20 rounded-2xl flex items-center justify-center text-2xl font-black text-[#C694F9] bg-cover bg-center overflow-hidden"
                      style={{ backgroundImage: receiverProfile.avatar_url ? `url(${receiverProfile.avatar_url})` : undefined }}
                    >
                      {!receiverProfile.avatar_url && (receiverProfile.display_name?.[0] || receiverProfile.username[0])}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">{receiverProfile.display_name}</span>
                        {receiverProfile.verified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                      </div>
                      <p className="text-zinc-500 text-sm">{receiverProfile.username}@expo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Prefers</p>
                      <p className="font-black text-[#C694F9]">{receiverProfile.preferred_currency}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold",
                    receiverProfile.verified 
                      ? "bg-green-500/10 border border-green-500/20 text-green-400" 
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  )}>
                    <Shield className="w-4 h-4" />
                    {receiverProfile.verified ? (
                      <span>Verified EXPO Identity - Phone confirmed</span>
                    ) : (
                      <span>Unverified Identity - Proceed with caution</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

<div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Payment Amount</label>
              <div className="relative group">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 h-20 text-4xl font-black pr-24 rounded-2xl focus:border-[#C694F9]/50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xl uppercase tracking-widest">{senderCurrency}</div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Payment Purpose (shows on Stellar)</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-white/5 border border-white/10 h-14 px-5 text-base font-bold rounded-2xl focus:border-[#C694F9]/50 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="" className="bg-zinc-900">Select purpose (optional)</option>
                <option value="P2P Transfer" className="bg-zinc-900">P2P Transfer</option>
                <option value="Family Support" className="bg-zinc-900">Family Support</option>
                <option value="Gift" className="bg-zinc-900">Gift</option>
                <option value="Business Payment" className="bg-zinc-900">Business Payment</option>
                <option value="Services" className="bg-zinc-900">Services</option>
                <option value="Loan Repayment" className="bg-zinc-900">Loan Repayment</option>
                <option value="Education" className="bg-zinc-900">Education</option>
                <option value="Travel" className="bg-zinc-900">Travel</option>
                <option value="Medical" className="bg-zinc-900">Medical</option>
              </select>
            </div>

          <AnimatePresence>
            {quote && receiverProfile && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-bold text-green-500">Rate Locked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className={cn("text-sm font-black tabular-nums", countdown <= 10 ? "text-red-500" : "text-amber-500")}>{countdown}s</span>
                    <button onClick={generateQuote} disabled={quoteLoading} className="p-1.5 hover:bg-white/5 rounded-lg">
                      <RefreshCw className={cn("w-4 h-4 text-zinc-500", quoteLoading && "animate-spin")} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-4 border-y border-white/5">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">You send</p>
                    <p className="text-2xl font-black">{quote.source_amount} {senderCurrency}</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-zinc-600" />
                  <div className="text-right">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{receiverProfile.display_name} gets</p>
                    <p className="text-2xl font-black text-[#C694F9]">~{quote.target_amount.toFixed(2)} {quote.to_currency}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Exchange Rate</span>
                  <span className="font-bold">1 {senderCurrency} = {quote.rate.toFixed(4)} {quote.to_currency}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {quoteLoading && (
            <div className="flex items-center justify-center gap-3 py-4 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Fetching exchange rate...</span>
            </div>
          )}

          <div 
            className={cn("flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all", 
              useGasless ? "bg-[#C694F9]/10 border-[#C694F9]/30" : "bg-white/5 border-white/10 hover:bg-white/10")}
            onClick={() => setUseGasless(!useGasless)}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", 
                useGasless ? "bg-[#C694F9]/20" : "bg-white/10")}>
                <Zap className={cn("w-5 h-5 transition-colors", useGasless ? "text-[#C694F9]" : "text-zinc-500")} />
              </div>
              <div>
                <p className={cn("font-bold transition-colors", useGasless ? "text-[#C694F9]" : "text-white")}>Gasless Transaction ⚡</p>
                <p className="text-xs text-zinc-500">Platform pays the Stellar network fee</p>
              </div>
            </div>
            <div className={cn("w-12 h-6 rounded-full p-1 transition-colors", useGasless ? "bg-[#C694F9]" : "bg-zinc-700")}>
              <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", useGasless ? "translate-x-6" : "translate-x-0")} />
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold uppercase">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <Button 
            type="button"
            onClick={handleInitiateSend}
            disabled={loading || !receiverProfile || !quote || countdown === 0} 
            className="w-full h-20 bg-[#C694F9] hover:bg-[#C694F9]/90 text-black text-2xl font-black rounded-3xl shadow-2xl shadow-[#C694F9]/30 disabled:opacity-50 group"
          >
            {loading ? (
              <span className="flex items-center gap-3"><Loader2 className="w-7 h-7 animate-spin" /> PROCESSING...</span>
            ) : (
              <span className="flex items-center gap-2 uppercase">SEND PAYMENT <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" /></span>
            )}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPinModal && (
          <PinModal 
            isOpen={showPinModal} 
            onClose={() => { setShowPinModal(false); setPinError(""); }} 
            onSubmit={handleSend} 
            loading={loading} 
            receiver={receiverProfile} 
            quote={quote}
            pinError={pinError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SendPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#C694F9]" />
          <p className="text-zinc-500 font-black text-xs uppercase tracking-widest">Initializing Route</p>
        </div>
      }>
        <SendForm />
      </Suspense>
    </div>
  );
}
