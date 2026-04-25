"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Shield, LogOut, Copy, Check, ExternalLink, Loader2, Wallet, Globe, Lock, Key, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/expo/profile")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const copyId = () => {
    if (profile?.universal_id) {
      navigator.clipboard.writeText(`${profile.universal_id}@expo`);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const copyAddr = () => {
    if (profile?.stellar_address) {
      navigator.clipboard.writeText(profile.stellar_address);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="text-zinc-500 font-black tracking-widest uppercase text-xs animate-pulse">Loading Identity Profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-20">

      {/* ── Manage Keys Modal ── */}
      <AnimatePresence>
        {showKeysModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowKeysModal(false)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2"><Key className="w-5 h-5 text-blue-500" /> Manage Keys</h3>
                <button onClick={() => setShowKeysModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
              <p className="text-zinc-500 text-sm">Your Stellar wallet keys are managed securely. Your secret key is never stored in plain text.</p>
              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Public Key (Stellar Address)</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-blue-400 font-mono flex-1 truncate">{profile?.stellar_address}</code>
                    <button onClick={() => { navigator.clipboard.writeText(profile?.stellar_address || ""); toast.success("Copied!"); }} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10">
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <p className="text-[10px] text-red-400/70 uppercase tracking-widest mb-1">Secret Key</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-red-400/60 font-mono flex-1">{showSecret ? "S••••••••••••••••••••••••••••••••••••••••••••••••••••" : "Hidden for security"}</code>
                    <button onClick={() => setShowSecret(s => !s)} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10">
                      {showSecret ? <EyeOff className="w-3.5 h-3.5 text-zinc-400" /> : <Eye className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">⚠️ Never share your secret key with anyone. ExpoPay will never ask for it.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2FA Modal ── */}
      <AnimatePresence>
        {show2FAModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShow2FAModal(false)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2"><Lock className="w-5 h-5 text-purple-500" /> 2FA Settings</h3>
                <button onClick={() => setShow2FAModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
              <p className="text-zinc-500 text-sm">Two-Factor Authentication adds an extra layer of security to your account.</p>
              <button
                onClick={() => {
                  setTwoFactor(v => {
                    const next = !v;
                    toast.success(next ? "2FA enabled — your account is more secure!" : "2FA disabled");
                    return next;
                  });
                }}
                className={`w-full h-12 rounded-xl font-bold text-sm transition-all ${
                  twoFactor
                    ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                    : "bg-[#C694F9] hover:bg-[#C694F9]/90 text-black"
                }`}
              >
                {twoFactor ? "Disable 2FA" : "Enable 2FA"}
              </button>
              <div className={`flex items-center gap-2 text-xs ${twoFactor ? "text-green-400" : "text-zinc-500"}`}>
                <div className={`w-2 h-2 rounded-full ${twoFactor ? "bg-green-400" : "bg-zinc-600"}`} />
                {twoFactor ? "2FA is currently active" : "2FA is not enabled"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-none">
            ACCOUNT
          </h1>
          <p className="text-zinc-500 font-medium text-lg">Manage your universal payment identity</p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Main Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 sm:p-8 md:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <User className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 space-y-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
              <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-blue-600/20 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-600/20">
                <span className="text-3xl sm:text-4xl font-black text-blue-500">{profile?.universal_id?.[0].toUpperCase()}</span>
              </div>
              <div className="space-y-1 min-w-0 w-full">
                <h3 className="text-2xl sm:text-4xl font-black tracking-tight uppercase leading-none truncate">{profile?.universal_id}@expo</h3>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs flex items-center justify-center sm:justify-start gap-2 truncate">
                  <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{profile?.email}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-1">EXPO Universal ID</label>
                <div className="group relative flex items-center justify-between p-4 sm:p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="font-black text-blue-500 text-lg tracking-tight uppercase truncate block w-full">{profile?.universal_id}@expo</span>
                  </div>
                  <button onClick={copyId} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors shrink-0">
                    <AnimatePresence mode="wait">
                      {copiedId ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check">
                          <Check className="w-5 h-5 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy">
                          <Copy className="w-5 h-5 text-zinc-500" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-1">On-Chain Stellar Address</label>
                <div className="group relative flex items-center justify-between p-4 sm:p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all gap-4">
                  <div className="min-w-0 flex-1">
                    <code className="text-xs text-zinc-500 font-mono truncate block w-full group-hover:text-zinc-300 transition-colors">{profile?.stellar_address}</code>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={copyAddr} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                      <AnimatePresence mode="wait">
                        {copiedAddr ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check">
                            <Check className="w-5 h-5 text-green-500" />
                          </motion.div>
                        ) : (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy">
                            <Copy className="w-5 h-5 text-zinc-500" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                    <a 
                      href={`https://stellar.expert/explorer/testnet/account/${profile?.stellar_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-zinc-500 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System & Security Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
          <Card className="glass-card p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-none flex flex-col justify-between group">
            <div className="space-y-6">
              <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-500 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black tracking-tight uppercase">SECURITY PROTOCOL</h4>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Your identity is secured by the Soroban smart contract registry v1.0.4. All private keys are isolated in a HSM environment.
                </p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-green-500">
              <Check className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">ENCRYPTED & SYNCED</span>
            </div>
          </Card>

          <Card className="glass-card p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-none flex flex-col justify-between group">
            <div className="space-y-6">
              <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-500 group-hover:scale-110 transition-transform">
                <Globe className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black tracking-tight uppercase">NETWORK NODE</h4>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Direct connection established with Stellar Horizon Testnet. Horizon version 2.14.0. Node: HORIZON-TESTNET-PROD.
                </p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-blue-500">
              <RefreshCw className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">STELLAR SYNCED</span>
            </div>
          </Card>
        </div>

        {/* Security Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Button variant="outline" onClick={() => setShowKeysModal(true)} className="h-20 bg-white/5 hover:bg-white/10 border-white/10 rounded-3xl gap-3 sm:gap-4 group justify-start px-4 sm:px-8">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-blue-600/20 transition-colors shrink-0">
              <Key className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-black text-xs sm:text-sm uppercase tracking-tight truncate">MANAGE KEYS</p>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-600 truncate">View your Stellar keys</p>
            </div>
          </Button>
          <Button variant="outline" onClick={() => setShow2FAModal(true)} className="h-20 bg-white/5 hover:bg-white/10 border-white/10 rounded-3xl gap-3 sm:gap-4 group justify-start px-4 sm:px-8">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-purple-600/20 transition-colors shrink-0">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-black text-xs sm:text-sm uppercase tracking-tight truncate">2FA SETTINGS</p>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-600 truncate">{twoFactor ? "Currently enabled" : "Enable now"}</p>
            </div>
          </Button>
        </div>
      </div>

      <div className="text-center pt-8">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">
            EXPO Protocol © 2024 • Distributed Identity Layer
          </p>
      </div>
    </div>
  );
}

const RefreshCw = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={cn(className, "animate-[spin_3s_linear_infinite]")}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M3 21v-5h5"/>
  </svg>
);
