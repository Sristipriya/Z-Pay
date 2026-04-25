"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Shield, LogOut, Copy, Check, ExternalLink, Loader2, Wallet, Globe, Lock, Key } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-none">
            ACCOUNT
          </h1>
          <p className="text-zinc-500 font-medium text-lg">Manage your universal payment identity</p>
        </div>
        <Button 
          onClick={handleLogout}
          variant="outline" 
          className="h-14 px-8 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40 font-black uppercase tracking-widest rounded-2xl gap-3"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </Button>
      </div>

      <div className="grid gap-8">
        {/* Main Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <User className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-blue-600/20 rounded-[2rem] flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-600/20">
                <span className="text-4xl font-black text-blue-500">{profile?.universal_id?.[0].toUpperCase()}</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-black tracking-tight uppercase leading-none">{profile?.universal_id}@expo</h3>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <Mail className="w-3 h-3" /> {profile?.email}
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-1">EXPO Universal ID</label>
                <div className="group relative flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                  <span className="font-black text-blue-500 text-lg tracking-tight uppercase">{profile?.universal_id}@expo</span>
                  <button onClick={copyId} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
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
                <div className="group relative flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                  <code className="text-xs text-zinc-500 font-mono truncate mr-8 group-hover:text-zinc-300 transition-colors">{profile?.stellar_address}</code>
                  <div className="flex gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="glass-card p-8 rounded-[2rem] border-none flex flex-col justify-between group">
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

          <Card className="glass-card p-8 rounded-[2rem] border-none flex flex-col justify-between group">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Button variant="outline" className="h-20 bg-white/5 hover:bg-white/10 border-white/10 rounded-3xl gap-4 group justify-start px-8">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-blue-600/20 transition-colors">
              <Key className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left">
              <p className="font-black text-sm uppercase tracking-tight">MANAGE KEYS</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Secure hardware backup</p>
            </div>
          </Button>
          <Button variant="outline" className="h-20 bg-white/5 hover:bg-white/10 border-white/10 rounded-3xl gap-4 group justify-start px-8">
            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-purple-600/20 transition-colors">
              <Lock className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-left">
              <p className="font-black text-sm uppercase tracking-tight">2FA SETTINGS</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Identity verification</p>
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
