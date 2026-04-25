"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Background } from "@/components/Background";
import { Logo } from "@/components/Logo";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-white selection:bg-[#C694F9]/30 overflow-hidden">
      <Background />

      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 bg-transparent">
        <Link href="/">
          <Logo />
        </Link>
        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-2 px-4 sm:px-6 h-10 sm:h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs sm:text-sm font-medium hover:bg-white/15 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </nav>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 sm:mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2rem,6vw,3rem)] font-black leading-[0.95] tracking-[-0.04em] mb-3 sm:mb-4 uppercase"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              <span className="block">RESET</span>
              <span className="block text-[#C694F9]">PASSWORD</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-white/50 text-sm sm:text-base"
            >
              Enter your email and we'll send you a 6-digit code to reset your password.
            </motion.p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-medium">Check your email for the reset code.</p>
              <p className="text-sm text-zinc-400">If it doesn't appear within a few minutes, check your spam folder.</p>
              <button
                onClick={() => router.push(`/auth/verify-reset-otp?email=${encodeURIComponent(email)}`)}
                className="group relative w-full h-12 sm:h-14 mt-4 bg-white text-black font-black text-sm sm:text-base rounded-xl sm:rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">Enter Code</span>
              </button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleReset}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-medium text-white/40 ml-1 uppercase tracking-wider">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full h-12 sm:h-14 bg-white/[0.03] border border-white/[0.08] rounded-xl sm:rounded-2xl px-4 sm:px-5 text-white text-sm sm:text-base placeholder:text-white/25 focus:border-[#C694F9]/40 focus:bg-white/[0.05] focus:ring-0 transition-all duration-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-xs sm:text-sm text-red-500 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="group relative w-full h-12 sm:h-14 mt-4 sm:mt-6 bg-white text-black font-black text-sm sm:text-base rounded-xl sm:rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Send Code"
                  )}
                </span>
              </button>
            </motion.form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
