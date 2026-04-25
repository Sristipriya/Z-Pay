"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowUpRight, BadgeCheck, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  username: string;
  display_name: string;
  full_name?: string;
  avatar_url?: string | null;
  address: string;
  preferred_currency: string;
  verified: boolean;
}

interface RecentPerson {
  username: string;
  display_name: string;
  avatar_url?: string | null;
  last_paid_at: string;
  currency: string;
}

function Avatar({ url, name, size = "md" }: { url?: string | null; name: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-10 h-10" : "w-11 h-11";
  const text = size === "sm" ? "text-base" : "text-lg";
  return (
    <div
      className={cn(
        dim,
        "shrink-0 rounded-2xl flex items-center justify-center font-black uppercase overflow-hidden bg-cover bg-center",
        !url && "bg-gradient-to-br from-[#C694F9]/30 to-[#94A1F9]/30 border border-[#C694F9]/20 text-[#C694F9]",
        text
      )}
      style={{ backgroundImage: url ? `url(${url})` : undefined }}
    >
      {!url && (name[0] || "?")}
    </div>
  );
}

export function PaySearch({ recentContacts }: { recentContacts: RecentPerson[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    const clean = q.replace(/@expo/gi, "").trim();
    if (!clean) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/expo/resolve?username=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        setResults([{
          username:           data.username || clean,
          display_name:       data.display_name || data.full_name || data.username || clean,
          full_name:          data.full_name,
          avatar_url:         data.avatar_url || null,
          address:            data.address,
          preferred_currency: data.preferred_currency || "USDC",
          verified:           !!data.verified,
        }]);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (username: string) => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setIsFocused(false);
    inputRef.current?.blur();
    router.push(`/dashboard/send?to=${encodeURIComponent(username)}@expo`);
  };

  const handleFocus = () => { setIsFocused(true); setShowDropdown(true); };
  const handleClear = () => { setQuery(""); setResults([]); inputRef.current?.focus(); };

  const showResults = showDropdown && (results.length > 0 || (searching && query.length >= 2));
  const showRecents = showDropdown && !query && recentContacts.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <motion.div
        animate={{ scale: isFocused ? 1.01 : 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative flex items-center gap-3 px-4 h-14 sm:h-16 rounded-2xl border transition-all duration-300",
          isFocused
            ? "bg-white/[0.07] border-[#C694F9]/40 shadow-[0_0_30px_-5px_rgba(198,148,249,0.25)]"
            : "bg-white/[0.04] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06]"
        )}
      >
        <Search className={cn("w-5 h-5 shrink-0 transition-colors duration-300", isFocused ? "text-[#C694F9]" : "text-white/35")} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search by Expo ID or name…"
          className="flex-1 bg-transparent text-white placeholder:text-white/30 text-base font-medium outline-none"
        />
        <AnimatePresence mode="wait">
          {searching && query ? (
            <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 className="w-4 h-4 text-[#C694F9] animate-spin" />
            </motion.div>
          ) : query ? (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={handleClear}
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/70" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {(showResults || showRecents) && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          >
            {showResults && (
              <div>
                {searching && results.length === 0 ? (
                  <div className="flex items-center gap-3 px-5 py-4 text-white/40 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Looking up &ldquo;{query}&rdquo;…
                  </div>
                ) : results.map(r => (
                  <button
                    key={r.username}
                    onClick={() => handleSelect(r.username)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.06] transition-colors group text-left"
                  >
                    <Avatar url={r.avatar_url} name={r.display_name || r.username} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate">{r.display_name}</span>
                        {r.verified && <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-sm text-white/40 truncate">{r.username}@expo</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-white/30 uppercase">{r.preferred_currency}</span>
                      <div className="w-8 h-8 rounded-xl bg-[#C694F9]/10 border border-[#C694F9]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-4 h-4 text-[#C694F9]" />
                      </div>
                    </div>
                  </button>
                ))}
                {!searching && query.length >= 2 && results.length === 0 && (
                  <div className="px-5 py-4 text-white/30 text-sm">No user found for &ldquo;{query}&rdquo;</div>
                )}
              </div>
            )}

            {showRecents && (
              <div>
                <p className="px-5 pt-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Recents</p>
                {recentContacts.slice(0, 5).map(p => (
                  <button
                    key={p.username}
                    onClick={() => handleSelect(p.username)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.06] transition-colors group text-left"
                  >
                    <div
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-white/60 text-base uppercase overflow-hidden bg-cover bg-center"
                      style={{ backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : undefined }}
                    >
                      {!p.avatar_url && (p.display_name || p.username)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white/80 truncate text-sm">{p.display_name}</p>
                      <p className="text-xs text-white/30 truncate">{p.username}@expo</p>
                    </div>
                    <Clock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  </button>
                ))}
                <div className="h-2" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
