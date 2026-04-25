"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, QrCode, History, User, Scan, LayoutDashboard, Store, Settings, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Background } from "@/components/Background";
import { InactivityGuard } from "@/components/InactivityGuard";
import { PaymentNotification } from "@/components/PaymentNotification";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; universal_id: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch profile for notification listener
    fetch("/api/expo/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.id && data?.universal_id) {
          setCurrentUser({ id: data.id, universal_id: data.universal_id });
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
      { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
      { label: "History", icon: History, href: "/dashboard/history" },
      { label: "Scan & Pay", icon: Scan, href: "/dashboard/scan", primary: true },
      { label: "Split", icon: Users, href: "/dashboard/split" },
      { label: "Contracts", icon: FileText, href: "/dashboard/contracts" },
    ];

  const sidebarItems = [
      { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Transactions", icon: History, href: "/dashboard/history" },
      { label: "Scan & Pay", icon: Scan, href: "/dashboard/scan" },
      { label: "Send Money", icon: Send, href: "/dashboard/send" },
      { label: "Split Bills", icon: Users, href: "/dashboard/split" },
      { label: "Pay Merchant", icon: Store, href: "/dashboard/merchant" },
      { label: "Contracts", icon: FileText, href: "/dashboard/contracts" },
      { label: "My Code", icon: QrCode, href: "/dashboard/receive" },
    ];

  return (
    <InactivityGuard>
    <div className="min-h-screen bg-transparent text-white selection:bg-[#C694F9]/30">
      <Background />
      {currentUser && (
        <PaymentNotification
          currentUserId={currentUser.id}
          currentUniversalId={currentUser.universal_id}
        />
      )}
      
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 xl:w-80 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex-col p-6 xl:p-8 z-40">
        <div className="mb-12 xl:mb-16">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 space-y-2 xl:space-y-3">
          <p className="text-[9px] xl:text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 xl:mb-6 px-3 xl:px-4">Menu</p>
          {sidebarItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 xl:gap-4 px-3 xl:px-4 h-12 xl:h-14 rounded-xl xl:rounded-2xl transition-all relative overflow-hidden",
                  mounted && pathname === item.href 
                    ? "bg-[#C694F9]/10 text-[#C694F9] border border-[#C694F9]/20 shadow-[0_0_20px_-5px_rgba(198,148,249,0.2)]" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "w-5 xl:w-6 h-5 xl:h-6 transition-transform group-hover:scale-110",
                  mounted && pathname === item.href ? "text-[#C694F9]" : "text-white/40"
                )} />
                <span className="font-bold tracking-tight text-sm xl:text-base">{item.label}</span>
                {mounted && pathname === item.href && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute left-0 w-1 h-5 xl:h-6 bg-[#C694F9] rounded-r-full"
                  />
                )}
              </Link>
          ))}
        </nav>

        <div className="pt-6 xl:pt-8 border-t border-white/5 space-y-2">
            <Link 
              href="/dashboard/settings"
              className={cn(
                "flex items-center gap-3 xl:gap-4 px-3 xl:px-4 h-12 xl:h-14 rounded-xl xl:rounded-2xl transition-all",
                mounted && pathname === "/dashboard/settings" ? "bg-white/5 text-white" : "text-white/50 hover:text-white"
              )}
            >
              <Settings className="w-5 xl:w-6 h-5 xl:h-6" />
              <span className="font-bold tracking-tight text-sm xl:text-base">Settings</span>
            </Link>
            <Link 
              href="/dashboard/profile"
              className={cn(
                "flex items-center gap-3 xl:gap-4 px-3 xl:px-4 h-12 xl:h-14 rounded-xl xl:rounded-2xl transition-all",
                mounted && pathname === "/dashboard/profile" ? "bg-white/5 text-white" : "text-white/50 hover:text-white"
              )}
            >
              <User className="w-5 xl:w-6 h-5 xl:h-6" />
              <span className="font-bold tracking-tight text-sm xl:text-base">Account</span>
            </Link>
          </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-black/40 backdrop-blur-2xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard">
          <Logo size="small" />
        </Link>
        <Link 
          href="/dashboard/settings" 
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
        >
          <Settings className="w-5 h-5 text-white/70" />
        </Link>
      </header>

      <main className="lg:pl-72 xl:pl-80 pb-28 lg:pb-0">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 max-w-5xl">
          <motion.div
            key={mounted ? pathname : 'initial'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 h-16 sm:h-20 bg-black/60 backdrop-blur-2xl border border-white/10 flex items-center justify-around px-2 sm:px-4 z-50 rounded-2xl sm:rounded-[2.5rem] shadow-2xl">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 sm:gap-1.5 transition-all relative",
              mounted && pathname === item.href ? "text-[#C694F9] scale-105 sm:scale-110" : "text-white/50 hover:text-white/70"
            )}
          >
            {item.primary ? (
              <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-[#C694F9] to-[#94A1F9] rounded-full flex items-center justify-center -mt-8 sm:-mt-12 border-4 sm:border-[6px] border-black shadow-2xl shadow-[#C694F9]/40 transition-transform active:scale-90">
                <Scan className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
              </div>
            ) : (
              <div className="relative">
                <item.icon className="w-6 sm:w-7 h-6 sm:h-7" />
                {mounted && pathname === item.href && (
                  <motion.div 
                    layoutId="mobile-dot"
                    className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#C694F9] rounded-full shadow-[0_0_8px_rgba(198,148,249,1)]"
                  />
                )}
              </div>
            )}
          </Link>
        ))}
      </nav>
    </div>
    </InactivityGuard>
  );
}
