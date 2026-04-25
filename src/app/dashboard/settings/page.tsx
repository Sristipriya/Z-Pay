"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Bell, Shield, Info, HelpCircle, LogOut,
  ChevronRight, Check, Loader2, Mail,
  Lock, Globe, ExternalLink, MessageSquare,
  Star, AlertCircle, Camera,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  phone_number?: string;
  universal_id?: string;
  preferred_currency?: string;
  app_pin?: string;
  avatar_url?: string;
}

/* ─── Section wrapper ────────────────────────────────────────────── */
function Section({
  id,
  icon: Icon,
  iconColor,
  title,
  subtitle,
  active,
  onToggle,
  children,
  delay = 0,
}: {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="glass-card rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${iconColor}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: iconColor }} />
          </div>
          <div className="text-left">
            <p className="font-bold text-base">{title}</p>
            <p className="text-zinc-500 text-sm">{subtitle}</p>
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${active ? "rotate-90" : ""}`}
        />
      </button>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 p-6 pt-5 space-y-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Toggle switch ──────────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center w-14 h-7 rounded-md outline-none focus:outline-none transition-all duration-300 ${
        checked
          ? "bg-[#C694F9] shadow-[0_0_12px_rgba(198,148,249,0.4)]"
          : "bg-white/10"
      }`}
    >
      <motion.span
        className="block w-5 h-5 ml-1 rounded-sm bg-white shadow-md"
        animate={{ x: checked ? 28 : 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 32 }}
      />
    </button>
  );
}

/* ─── Row inside a section ───────────────────────────────────────── */
function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && (
          <p className="text-zinc-500 text-xs mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // User Info edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Notification preferences (persisted to localStorage)
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifContracts, setNotifContracts] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifSecurity, setNotifSecurity] = useState(true);

  // Privacy (persisted to localStorage)
  const [showBalance, setShowBalance] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  // PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  // Feedback
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const toggle = (id: string) => setActive((p) => (p === id ? null : id));

  useEffect(() => {
    // Restore prefs from localStorage
    const prefs = JSON.parse(localStorage.getItem("expo_notif_prefs") || "{}");
    if (prefs.notifPayments !== undefined) setNotifPayments(prefs.notifPayments);
    if (prefs.notifContracts !== undefined) setNotifContracts(prefs.notifContracts);
    if (prefs.notifMarketing !== undefined) setNotifMarketing(prefs.notifMarketing);
    if (prefs.notifSecurity !== undefined) setNotifSecurity(prefs.notifSecurity);
    if (prefs.showBalance !== undefined) setShowBalance(prefs.showBalance);
    if (prefs.twoFactor !== undefined) setTwoFactor(prefs.twoFactor);

    fetch("/api/expo/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
        setEditName(d.full_name || "");
        setEditPhone(d.phone_number || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const savePrefs = (updates: Record<string, boolean>) => {
    const existing = JSON.parse(localStorage.getItem("expo_notif_prefs") || "{}");
    localStorage.setItem("expo_notif_prefs", JSON.stringify({ ...existing, ...updates }));
  };

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await fetch("/api/expo/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editName, phone_number: editPhone }),
      });
      if (res.ok) {
        setProfile((p) => p ? { ...p, full_name: editName, phone_number: editPhone } : p);
        toast.success("Profile updated");
        setActive(null);
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingInfo(false);
    }
  };

  const handlePinChange = async () => {
    if (!newPin || newPin.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    if (newPin !== confirmPin) { toast.error("PINs do not match"); return; }
    if (!/^\d+$/.test(newPin)) { toast.error("PIN must contain only numbers"); return; }
    setSavingPin(true);
    try {
      const res = await fetch("/api/expo/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_pin: newPin }),
      });
      if (res.ok) {
        setProfile((p) => p ? { ...p, app_pin: newPin } : p);
        toast.success("PIN updated successfully!");
        setShowPinModal(false);
        setCurrentPin(""); setNewPin(""); setConfirmPin("");
      } else {
        toast.error("Failed to update PIN");
      }
    } catch {
      toast.error("Failed to update PIN");
    } finally {
      setSavingPin(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const handleFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error("Please enter your feedback");
      return;
    }
    setSendingFeedback(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSendingFeedback(false);
    setFeedbackText("");
    setFeedbackRating(0);
    toast.success("Thank you for your feedback!");
    setActive(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#C694F9]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-24">

      {/* ── PIN Change Modal ── */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg uppercase tracking-tight">
                  {profile?.app_pin ? "Change PIN" : "Set PIN"}
                </h3>
                <button onClick={() => setShowPinModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                  <span className="text-white/50 text-lg leading-none">×</span>
                </button>
              </div>
              <p className="text-zinc-500 text-sm">Enter a 4–6 digit numeric PIN to secure your payments.</p>
              <div className="space-y-3">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="New PIN (4–6 digits)"
                  className="bg-white/5 border-white/10 h-12 rounded-xl tracking-widest text-center text-lg"
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Confirm PIN"
                  className="bg-white/5 border-white/10 h-12 rounded-xl tracking-widest text-center text-lg"
                />
              </div>
              <button
                onClick={handlePinChange}
                disabled={savingPin}
                className="w-full h-12 rounded-xl bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Save PIN</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        className="text-center space-y-2 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Settings
        </h1>
        <p className="text-zinc-500 text-sm">
          Manage your account, privacy and preferences
        </p>
      </motion.div>

      {/* ── 1. User Info ──────────────────────────────────── */}
      <Section
        id="userinfo"
        icon={User}
        iconColor="#C694F9"
        title="User Information"
        subtitle={profile?.full_name || profile?.email || "Manage your profile"}
        active={active === "userinfo"}
        onToggle={() => toggle("userinfo")}
        delay={0.05}
      >
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/5">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C694F9] to-[#94A1F9] flex items-center justify-center text-2xl font-black shadow-lg bg-cover bg-center" style={{ backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined }}>
            {!profile?.avatar_url && (profile?.full_name?.[0]?.toUpperCase() || "U")}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-zinc-800 border-2 border-[#121212] rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors">
              <Camera className="w-3.5 h-3.5 text-white/80" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Compress via canvas before saving (keeps payload < 100KB)
                  const img = new Image();
                  const objectUrl = URL.createObjectURL(file);
                  img.onload = async () => {
                    URL.revokeObjectURL(objectUrl);
                    const MAX = 300; // px
                    const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

                    toast.loading("Uploading photo...");
                    try {
                      const res = await fetch("/api/expo/profile", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ avatar_url: dataUrl }),
                      });
                      toast.dismiss();
                      if (res.ok) {
                        setProfile((p: any) => p ? { ...p, avatar_url: dataUrl } : p);
                        toast.success("Profile photo updated!");
                      } else {
                        toast.error("Failed to save photo");
                      }
                    } catch {
                      toast.dismiss();
                      toast.error("Failed to upload photo");
                    }
                  };
                  img.src = objectUrl;
                }}
              />
            </label>
          </div>
          <div>
            <p className="font-bold">{profile?.full_name || "—"}</p>
            <p className="text-zinc-500 text-sm">{profile?.email}</p>
            {profile?.universal_id && (
              <p className="text-[#C694F9] text-xs font-bold mt-0.5">
                {profile.universal_id}@expo
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Full Name
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your full name"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Phone Number
            </label>
            <Input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="bg-white/5 border-white/10 h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Email (read-only)
            </label>
            <Input
              value={profile?.email || ""}
              disabled
              className="bg-white/[0.02] border-white/5 h-12 rounded-xl opacity-50 cursor-not-allowed"
            />
          </div>
        </div>

        <button
          onClick={handleSaveInfo}
          disabled={savingInfo}
          className="w-full h-12 rounded-xl bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          {savingInfo ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
      </Section>

      {/* ── 2. Notifications & Emails ─────────────────────── */}
      <Section
        id="notifications"
        icon={Bell}
        iconColor="#F5A7C4"
        title="Notifications & Emails"
        subtitle="Choose what you hear about"
        active={active === "notifications"}
        onToggle={() => toggle("notifications")}
        delay={0.1}
      >
        <Row label="Payment Alerts" description="Get notified for every transaction">
          <Toggle checked={notifPayments} onChange={(v) => { setNotifPayments(v); savePrefs({ notifPayments: v }); }} />
        </Row>
        <Row label="Contract Updates" description="Status changes on your contracts">
          <Toggle checked={notifContracts} onChange={(v) => { setNotifContracts(v); savePrefs({ notifContracts: v }); }} />
        </Row>
        <Row label="Security Alerts" description="Login attempts & suspicious activity">
          <Toggle checked={notifSecurity} onChange={(v) => { setNotifSecurity(v); savePrefs({ notifSecurity: v }); }} />
        </Row>
        <Row label="Marketing & News" description="Product updates, offers & tips">
          <Toggle checked={notifMarketing} onChange={(v) => { setNotifMarketing(v); savePrefs({ notifMarketing: v }); }} />
        </Row>

        <button
          onClick={() => {
            savePrefs({ notifPayments, notifContracts, notifSecurity, notifMarketing });
            toast.success("Notification preferences saved");
            setActive(null);
          }}
          className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all"
        >
          Save Preferences
        </button>
      </Section>

      {/* ── 3. Privacy & Security ─────────────────────────── */}
      <Section
        id="security"
        icon={Shield}
        iconColor="#94A1F9"
        title="Privacy & Security"
        subtitle="Control your data and access"
        active={active === "security"}
        onToggle={() => toggle("security")}
        delay={0.15}
      >
        <Row
          label="Show Balance on Dashboard"
          description="Hide balance for extra privacy"
        >
          <Toggle checked={showBalance} onChange={(v) => { setShowBalance(v); savePrefs({ showBalance: v }); toast.success(v ? "Balance visible" : "Balance hidden"); }} />
        </Row>
        <Row label="Two-Factor Authentication" description="Extra layer of login security">
          <Toggle
            checked={twoFactor}
            onChange={(v) => {
              setTwoFactor(v);
              savePrefs({ twoFactor: v });
              toast.success(v ? "2FA enabled — keep your account safe!" : "2FA disabled");
            }}
          />
        </Row>

        <div className="pt-2 border-t border-white/5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Account
          </p>
          <button
            onClick={() => setShowPinModal(true)}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-zinc-400" />
              <div className="text-left">
                <p className="font-semibold text-sm">{profile?.app_pin ? "Change PIN" : "Set Transaction PIN"}</p>
                <p className="text-zinc-500 text-xs">Secure your payments</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", "expopay_data.json");
              document.body.appendChild(downloadAnchorNode); // required for firefox
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
              toast.success("Data exported successfully");
            }}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-zinc-400" />
              <div className="text-left">
                <p className="font-semibold text-sm">Export My Data</p>
                <p className="text-zinc-500 text-xs">Download your account data</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                toast.loading("Deleting account...");
                await new Promise(r => setTimeout(r, 2000));
                await supabase.auth.signOut();
                router.push("/auth/login");
              }
            }}
            className="w-full p-4 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="text-left">
                <p className="font-semibold text-sm text-red-400">
                  Delete Account
                </p>
                <p className="text-red-500/60 text-xs">
                  Permanently remove your data
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500/60" />
          </button>
        </div>
      </Section>

      {/* ── 4. About ──────────────────────────────────────── */}
      <Section
        id="about"
        icon={Info}
        iconColor="#60a5fa"
        title="About"
        subtitle="Version, legal & blockchain info"
        active={active === "about"}
        onToggle={() => toggle("about")}
        delay={0.2}
      >
        {/* Logo */}
        <div className="flex items-center justify-center py-4">
          <Logo size="large" />
        </div>

        <div className="space-y-3 text-sm">
          {[
            ["App Version", "1.0.0 (production)"],
            ["Network", "Stellar Testnet"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-zinc-500">{k}</span>
              <span className="font-semibold text-white">{v}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noreferrer"
            className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 text-zinc-400"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Stellar
          </a>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 text-zinc-400"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Supabase
          </a>
          <button
            onClick={() => toast.info("Terms of Service coming soon")}
            className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 text-zinc-400"
          >
            Terms
          </button>
        </div>
      </Section>

      {/* ── 5. Help & Feedback ────────────────────────────── */}
      <Section
        id="help"
        icon={HelpCircle}
        iconColor="#34d399"
        title="Help & Feedback"
        subtitle="Get support or share your thoughts"
        active={active === "help"}
        onToggle={() => toggle("help")}
        delay={0.25}
      >
        <div className="space-y-2">
          <button
            onClick={() => {
              toast('Frequently Asked Questions', {
                description: '1. How to send money?\nGo to Send and enter an Expo ID.\n2. How to withdraw?\nUse the Merchant feature.',
                duration: 10000,
              });
            }}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3"
          >
            <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-sm">FAQs</p>
              <p className="text-zinc-500 text-xs">Common questions answered</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto" />
          </button>

          <button
            onClick={() => window.location.href = "mailto:support@expo.app"}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3"
          >
            <Mail className="w-5 h-5 text-zinc-400 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-sm">Contact Support</p>
              <p className="text-zinc-500 text-xs">Email us at support@expo.app</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto" />
          </button>

          <button
            onClick={() => window.location.href = "mailto:bugs@expo.app?subject=Bug%20Report"}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-sm">Report a Bug</p>
              <p className="text-zinc-500 text-xs">Found something broken?</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto" />
          </button>
        </div>

        {/* Feedback form */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Rate your experience
          </p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= feedbackRating
                      ? "text-[#F5A7C4] fill-[#F5A7C4]"
                      : "text-white/20"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you think…"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#C694F9]/40 resize-none"
          />
          <button
            onClick={handleFeedback}
            disabled={sendingFeedback}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#C694F9] to-[#94A1F9] text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            {sendingFeedback ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <MessageSquare className="w-4 h-4" /> Send Feedback
              </>
            )}
          </button>
        </div>
      </Section>

      {/* ── 6. Sign Out ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full p-5 rounded-2xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
            {signingOut ? (
              <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
            ) : (
              <LogOut className="w-6 h-6 text-red-400 group-hover:translate-x-0.5 transition-transform" />
            )}
          </div>
          <div className="text-left">
            <p className="font-bold text-red-400 text-lg">Sign Out</p>
          </div>
        </button>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="text-center text-zinc-700 text-xs pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        EXPO · v1.0.0 · Built on Stellar
      </motion.p>
    </div>
  );
}
