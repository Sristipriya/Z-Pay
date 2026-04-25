"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react";

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE_MS = 60 * 1000;           // warn 1 min before

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

export function InactivityGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const doLogout = useCallback(async () => {
    clearAll();
    localStorage.removeItem("expopay_last_activity");
    await supabase.auth.signOut();
    router.push("/auth/login?reason=inactivity");
  }, [clearAll, router]);

  const resetTimers = useCallback(() => {
    clearAll();
    setShowWarning(false);
    setSecondsLeft(60);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(60);

      // start countdown
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    logoutTimerRef.current = setTimeout(doLogout, INACTIVITY_TIMEOUT_MS);
  }, [clearAll, doLogout]);

  useEffect(() => {
    const lastActivity = localStorage.getItem("expopay_last_activity");
    if (lastActivity && Date.now() - parseInt(lastActivity) > INACTIVITY_TIMEOUT_MS) {
      doLogout();
      return;
    }

    const updateLastActivity = () => {
      localStorage.setItem("expopay_last_activity", Date.now().toString());
    };

    resetTimers();
    updateLastActivity();

    const handleActivity = () => {
      updateLastActivity();
      if (!showWarning) resetTimers();
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, handleActivity, { passive: true })
    );
    return () => {
      clearAll();
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, handleActivity)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStayLoggedIn = () => {
    resetTimers();
  };

  return (
    <>
      {children}

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl"
            >
              {/* gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C694F9] via-[#F5A7C4] to-[#94A1F9]" />

              {/* Icon */}
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <ShieldAlert className="w-8 h-8 text-amber-400" />
              </div>

              <h2 className="text-xl font-black tracking-tight mb-2">
                Session Expiring
              </h2>
              <p className="text-white/50 text-sm mb-6">
                You&apos;ve been inactive. You&apos;ll be automatically signed
                out in
              </p>

              {/* Countdown */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="#F5A7C4"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - secondsLeft / 60)}`}
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black tabular-nums">
                      {secondsLeft}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={doLogout}
                  className="flex-1 h-12 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  onClick={handleStayLoggedIn}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#C694F9] to-[#94A1F9] text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Stay Logged In
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
