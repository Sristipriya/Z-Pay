"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Share2, Info, Loader2, Sparkles, QrCode, Link as LinkIcon, User, Phone, Globe } from "lucide-react";
import { toast } from "sonner";

export default function ReceivePage() {
  const [profile, setProfile] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/expo/profile")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, []);

  const qrData = JSON.stringify({
    expo: profile?.universal_id ? `${profile.universal_id}@expo` : "",
    network: "stellar-testnet",
    type: "payment",
    amount: amount || undefined,
    currency: profile?.preferred_currency || "USDC",
    note: note || undefined
  });

  const requestLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/pay?to=${profile?.universal_id}${amount ? `&amount=${amount}` : ''}${note ? `&note=${encodeURIComponent(note)}` : ''}`
    : '';

  const copyId = () => {
    if (profile?.universal_id) {
      navigator.clipboard.writeText(`${profile.universal_id}@expo`);
      setCopiedId(true);
      toast.success("Identity copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const copyRequestLink = () => {
    navigator.clipboard.writeText(requestLink);
    setCopiedLink(true);
    toast.success("Payment request link copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-[#C694F9]" />
        <p className="text-white/40 font-black tracking-widest uppercase text-xs animate-pulse">Generating Secure Identity</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
          <Globe className="w-3.5 h-3.5 text-[#C694F9]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Global Payment Gateway</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
          RECEIVE
        </h1>
        <p className="text-white/40 font-medium text-lg">Accept payments from any app, any currency, anywhere.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-[#C694F9]/20 via-[#F5A7C4]/20 to-[#94A1F9]/20 rounded-[3rem] blur-2xl opacity-50" />
          <div className="relative bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-8 rounded-[2.5rem] flex flex-col items-center gap-8">
            <div className="relative p-5 bg-white rounded-[2rem] shadow-2xl overflow-hidden group/qr">
              <QRCodeSVG 
                value={qrData} 
                size={200}
                level="H"
                className="relative z-10 w-full h-auto"
              />
              <div className="absolute inset-0 bg-[#C694F9]/5 opacity-0 group-hover/qr:opacity-100 transition-opacity" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C694F9]">Universal Identity</span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">{profile?.universal_id}@expo</h3>
            </div>

            <Button 
              onClick={copyId} 
              className="w-full h-14 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white font-black rounded-2xl gap-3 transition-all"
            >
              {copiedId ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copiedId ? "COPIED" : "COPY ID"}
            </Button>
          </div>
        </motion.div>

        {/* Request Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-8 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3 text-[#F5A7C4]">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Request Funds</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Amount (Optional)</label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 h-14 text-xl font-black pl-5 rounded-xl focus:border-[#C694F9]/50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 font-black text-sm">{profile?.preferred_currency}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Note (Optional)</label>
                <Input 
                  placeholder="e.g. Dinner split"
                  className="bg-white/5 border-white/10 h-14 text-lg font-bold pl-5 rounded-xl focus:border-[#C694F9]/50"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button 
                  onClick={copyRequestLink}
                  className="w-full h-16 bg-gradient-to-r from-[#C694F9] to-[#94A1F9] text-white font-black text-lg rounded-2xl gap-3 shadow-xl shadow-[#C694F9]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {copiedLink ? <Check className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />}
                  {copiedLink ? "LINK COPIED" : "SHARE REQUEST LINK"}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 rounded-[2rem] space-y-4">
            <div className="flex items-center gap-3 text-white/40">
              <User className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Public Profile Verification</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#C694F9]/20 flex items-center justify-center text-[#C694F9] font-black text-xs">
                    {profile?.full_name?.[0]}
                  </div>
                  <span className="text-sm font-bold text-white/80">{profile?.full_name}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20">
                  <Check className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase">Verified</span>
                </div>
              </div>
              {profile?.phone_number && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/[0.05]">
                  <Phone className="w-4 h-4 text-white/30" />
                  <span className="text-sm font-bold text-white/60">
                    {profile.phone_number.slice(0, 4)}••••{profile.phone_number.slice(-2)}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[9px] font-medium text-white/20 uppercase tracking-wider leading-relaxed">
              * Verification details are visible to senders to ensure trust and prevent fraud.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
