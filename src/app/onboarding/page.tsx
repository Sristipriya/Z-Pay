"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Check, Loader2, Shield, ArrowRight, ExternalLink, Sparkles, AlertCircle, User, Phone, Lock, Coins, Globe, Camera, Copy, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";

const steps = [
  { id: "id", title: "Claim Identity", description: "Your universal payment name" },
  { id: "profile", title: "Profile Details", description: "Basic info for trust & safety" },
  { id: "security", title: "Security", description: "Secure your transactions" },
];

const currencies = [
  { code: 'USDC', name: 'USDC', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'INR', name: 'Rupee', flag: '🇮🇳' },
  { code: 'GBP', name: 'Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Yen', flag: '🇯🇵' },
];

const countryCodes = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+82', country: 'KR', flag: '🇰🇷' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [pin, setPin] = useState("");
  const [currency, setCurrency] = useState("USDC");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [stellarAddress, setStellarAddress] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const router = useRouter();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Issue 1B: Redirect already-onboarded users away from /onboarding immediately
  useEffect(() => {
    const checkAlreadyOnboarded = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('universal_id')
        .eq('id', user.id)
        .single();
      if (profile?.universal_id) {
        router.replace('/dashboard');
      }
    };
    checkAlreadyOnboarded();
  }, [router]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      mouseX.set((clientX - innerWidth / 2) / 20);
      mouseY.set((clientY - innerHeight / 2) / 20);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Username availability check
  useEffect(() => {
    if (username.length < 3) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/zpay/check?username=${username}`);
        const data = await res.json();
        setIsAvailable(data.available);
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Issue 1A: Real-time phone duplicate check
  useEffect(() => {
    if (phoneNumber.length !== 10) {
      setPhoneTaken(null);
      return;
    }
    const fullPhone = `${countryCode}${phoneNumber}`;
    const timer = setTimeout(async () => {
      setPhoneChecking(true);
      try {
        const res = await fetch(`/api/zpay/check-phone?phone=${encodeURIComponent(fullPhone)}`);
        const data = await res.json();
        setPhoneTaken(data.taken);
      } catch (err) {
        console.error(err);
      } finally {
        setPhoneChecking(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [phoneNumber, countryCode]);

  const handleNextStep = () => {
    if (step === 0 && (!isAvailable || username.length < 3)) return;
    if (step === 1) {
      if (!fullName) { setError("Please enter your full name"); return; }
      if (phoneNumber.length !== 10) { setError("Phone number must be exactly 10 digits"); return; }
      if (phoneTaken) { setError("This phone number is already registered to another account"); return; }
      if (phoneTaken === null && phoneNumber.length === 10) { setError("Checking phone number, please wait..."); return; }
    }
    setError("");
    setStep(step + 1);
  };

  const handleFinish = async () => {
    if (pin.length !== 4) {
        setError("PIN must be 4 digits");
        return;
    }
    
    setSubmitting(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

// 1. Claim ID & Update Profile
        const res = await fetch("/api/zpay/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              username,
              full_name: fullName,
              phone_number: `${countryCode}${phoneNumber}`,
              app_pin: pin,
              preferred_currency: currency,
              avatar_url: avatarUrl,
          }),
        });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setTxHash(data.tx_hash);
        setStellarAddress(data.stellar_address || '');
        setSuccess(true);
      }
    } catch (err) {
      setError("Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-[#D4AF37]/30">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[40vw] max-w-[500px] aspect-square rounded-full bg-[#D4AF37]/15 blur-[100px] md:blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[35vw] max-w-[400px] aspect-square rounded-full bg-[#27272a]/10 blur-[80px] md:blur-[120px]" />
        </div>
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="max-w-md w-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 md:p-10 text-center relative overflow-hidden z-10"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] via-[#FBBF24] to-[#27272a]" />
          
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 sm:w-24 aspect-square bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 relative"
          >
            <Check className="w-10 sm:w-12 h-10 sm:h-12 text-[#D4AF37]" />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-[#D4AF37] rounded-full"
            />
          </motion.div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 sm:mb-4 uppercase" style={{ fontFamily: 'var(--font-syne)' }}>ALL SET!</h2>
          <p className="text-white/50 mb-6 sm:mb-8 text-sm sm:text-base">
            Welcome to ZPAY, <span className="text-white font-black">{fullName}</span>. Your universal identity <span className="text-white font-black">{username}@Zp</span> is now live.
          </p>

          {/* Fund wallet notice for mainnet */}
          {stellarAddress && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-2">⚡ Activate Your Wallet</p>
              <p className="text-white/60 text-xs mb-3">
                Send at least <span className="text-white font-bold">1 XLM</span> to this address to activate your wallet:
              </p>
              <div className="flex items-center gap-2 bg-black/40 rounded-xl p-3">
                <code className="text-[10px] text-amber-300 font-mono flex-1 break-all">{stellarAddress}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(stellarAddress);
                    setCopiedAddress(true);
                    setTimeout(() => setCopiedAddress(false), 2000);
                  }}
                  className="shrink-0 text-white/40 hover:text-white transition-colors"
                >
                  {copiedAddress
                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                    : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full h-12 sm:h-14 md:h-16 bg-white text-black hover:bg-white/90 text-base sm:text-lg md:text-xl font-black rounded-full shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              EXPLORE DASHBOARD <ArrowRight className="ml-2 w-5 sm:w-6 h-5 sm:h-6" />
            </Button>
            {txHash && (
              <Link
                href={`https://stellar.expert/explorer/public/tx/${txHash}`}
                target="_blank"
                className="flex items-center justify-center gap-2 text-white/30 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
              >
                Identity Receipt <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-[#D4AF37]/30">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          style={{ x: springX, y: springY, background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)', filter: 'blur(100px)' }}
          className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] aspect-square rounded-full opacity-[0.1]"
        />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 bg-transparent">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex gap-1">
            {steps.map((s, i) => (
                <div 
                    key={s.id} 
                    className={`w-8 h-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#D4AF37]' : 'bg-white/10'}`} 
                />
            ))}
        </div>
      </nav>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-lg"
        >
          <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-[2rem] p-8 sm:p-10 relative overflow-hidden">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black tracking-tight mb-2 uppercase" style={{ fontFamily: 'var(--font-syne)' }}>{steps[step].title}</h2>
              <p className="text-white/50">{steps[step].description}</p>
            </div>

            {step === 0 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Choose Username</label>
                  <div className="relative">
                    <Input
                      placeholder="yourname"
                      className="bg-white/[0.03] border-white/[0.08] h-16 text-2xl font-black pr-24 rounded-2xl focus:border-[#D4AF37]/50"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30 font-black text-xl">@Zp</div>
                  </div>
                  <div className="h-6">
                    {checking ? (
                      <p className="text-[10px] font-bold text-white/40 flex items-center gap-2">
                        <Loader2 className="w-3 animate-spin text-[#D4AF37]" /> CHECKING...
                      </p>
                    ) : isAvailable === true ? (
                      <p className="text-[10px] font-bold text-green-500 flex items-center gap-2">
                        <Check className="w-3" /> AVAILABLE
                      </p>
                    ) : isAvailable === false ? (
                      <p className="text-[10px] font-bold text-red-500 flex items-center gap-2">
                        <AlertCircle className="w-3" /> TAKEN
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button 
                  disabled={!isAvailable || username.length < 3}
                  onClick={handleNextStep}
                  className="w-full h-16 bg-white text-black hover:bg-white/90 text-lg font-black rounded-full transition-all"
                >
                  NEXT <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

{step === 1 && (
                <div className="space-y-6">
                  {/* Photo Upload */}
                  <div className="flex flex-col items-center gap-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Profile Photo (optional)</label>
                    <label className="relative cursor-pointer group">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#27272a] flex items-center justify-center text-3xl font-black overflow-hidden border-2 border-white/10 group-hover:border-[#D4AF37]/50 transition-all">
                        {avatarUrl
                          ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                          : <span>{fullName?.[0]?.toUpperCase() || <Camera className="w-8 h-8 text-white/60" />}</span>
                        }
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-zinc-800 border-2 border-black rounded-full flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-white/70" />
                      </div>
                      <input type="file" className="hidden" accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const img = new Image();
                          const objectUrl = URL.createObjectURL(file);
                          img.onload = () => {
                            URL.revokeObjectURL(objectUrl);
                            const MAX = 300;
                            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width * ratio;
                            canvas.height = img.height * ratio;
                            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                            setAvatarUrl(canvas.toDataURL("image/jpeg", 0.75));
                          };
                          img.src = objectUrl;
                        }}
                      />
                    </label>
                    {avatarUrl && <button onClick={() => setAvatarUrl(null)} className="text-xs text-zinc-500 hover:text-white transition-colors">Remove photo</button>}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Full Name</label>
                      <div className="relative">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                          <Input
                          placeholder="John Doe"
                          className="bg-white/[0.03] border-white/[0.08] h-14 pl-14 rounded-xl focus:border-[#D4AF37]/50"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Phone Number (10 digits)</label>
                      <div className="flex gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCountryPicker(!showCountryPicker)}
                            className="h-14 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl flex items-center gap-2 hover:bg-white/[0.06] transition-all min-w-[100px]"
                          >
                            <span className="text-lg">{countryCodes.find(c => c.code === countryCode)?.flag}</span>
                            <span className="font-bold text-sm">{countryCode}</span>
                          </button>
                          <AnimatePresence>
                            {showCountryPicker && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-50 max-h-60 overflow-y-auto shadow-2xl"
                              >
                                {countryCodes.map((c) => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setCountryCode(c.code); setShowCountryPicker(false); }}
                                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors ${countryCode === c.code ? 'bg-[#D4AF37]/20' : ''}`}
                                  >
                                    <span className="text-lg">{c.flag}</span>
                                    <span className="font-bold text-sm">{c.code}</span>
                                    <span className="text-xs text-white/40">{c.country}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="relative flex-1">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="1234567890"
                            maxLength={10}
                            className="bg-white/[0.03] border-white/[0.08] h-14 pl-12 rounded-xl focus:border-[#D4AF37]/50"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 min-h-[20px] ml-1">
                        {phoneNumber.length === 10 && (
                          phoneChecking ? (
                            <p className="text-[10px] font-bold text-white/40 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-[#D4AF37]" /> CHECKING...
                            </p>
                          ) : phoneTaken === true ? (
                            <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> ALREADY REGISTERED
                            </p>
                          ) : phoneTaken === false ? (
                            <p className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                              <Check className="w-3 h-3" /> AVAILABLE
                            </p>
                          ) : null
                        )}
                        {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                          <p className="text-[10px] text-white/30">{phoneNumber.length}/10 digits</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
                  <Button 
                    onClick={handleNextStep}
                    disabled={!fullName || phoneNumber.length !== 10 || phoneTaken !== false || phoneChecking}
                    className="w-full h-16 bg-white text-black hover:bg-white/90 text-lg font-black rounded-full transition-all disabled:opacity-50"
                  >
                    CONTINUE <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}

{step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 text-center block">Set 4-Digit PIN</label>
                      <div className="flex justify-center gap-4">
                        {[0, 1, 2, 3].map((i) => (
                          <input
                            key={i}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={pin[i] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(-1);
                              const newPin = pin.split('');
                              newPin[i] = val;
                              setPin(newPin.join(''));
                              if (val && i < 3) {
                                const next = document.querySelector(`input[data-pin-index="${i + 1}"]`) as HTMLInputElement;
                                next?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !pin[i] && i > 0) {
                                const prev = document.querySelector(`input[data-pin-index="${i - 1}"]`) as HTMLInputElement;
                                prev?.focus();
                              }
                            }}
                            data-pin-index={i}
                            autoFocus={i === 0}
                            className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-all text-center bg-white/5 focus:outline-none ${
                              pin[i] ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white' : 'border-white/10 text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Receive Currency</label>
                    <div className="grid grid-cols-5 gap-2">
                      {currencies.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => setCurrency(c.code)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            currency === c.code ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-lg mb-1">{c.flag}</span>
                          <span className="text-[10px] font-black">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}

                <Button 
                  disabled={submitting || pin.length !== 4}
                  onClick={handleFinish}
                  className="w-full h-16 bg-gradient-to-r from-[#D4AF37] to-[#27272a] text-white text-lg font-black rounded-full transition-all shadow-xl shadow-[#D4AF37]/20"
                >
                  {submitting ? (
                    <span className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" /> FINALIZING...
                    </span>
                  ) : "COMPLETE SETUP"}
                </Button>
              </div>
            )}

            <div className="mt-8 flex justify-center gap-4 text-[10px] font-black text-white/20 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> GLOBAL ACCESS</div>
                <div className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> IMMUTABLE ID</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
