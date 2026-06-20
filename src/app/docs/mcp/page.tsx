"use client";

import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import Navbar from "@/components/sections/Navbar";
import FooterCTA from "@/components/sections/FooterCTA";
import { Terminal, Code2, Bot, ShieldCheck, Zap, ChevronRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Spotlight } from "@/components/ui/spotlight";
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

export default function MCPDocsPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("how-it-works");

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".doc-section", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top 80%",
        }
      });
    }, contentRef);
    return () => ctx.revert();
  }, []);

  // Simple scroll spy for sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['how-it-works', 'installation', 'tools', 'security'];
      let current = '';
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            current = section;
          }
        }
      }
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'how-it-works', label: 'How it Works' },
    { id: 'installation', label: 'Installation' },
    { id: 'tools', label: 'Exposed Tools' },
    { id: 'security', label: 'Security & Signatures' },
  ];

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white/20 font-[family-name:var(--font-jakarta)] relative">
      <Navbar />

      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none fixed">
        <div className="absolute top-1/4 right-0 w-[50vw] max-w-[600px] aspect-square rounded-full bg-purple-600/10 blur-[150px] md:blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[45vw] max-w-[500px] aspect-square rounded-full bg-blue-600/10 blur-[130px] md:blur-[180px]" />
      </div>

      <div className="pt-32 pb-24 relative z-10" ref={contentRef}>
        
        {/* Header */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16 border-b border-white/5 pb-12">
          <div className="doc-section max-w-3xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6 shadow-2xl w-fit">
              <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/60">
                Developer Documentation
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 uppercase leading-[0.9]">
              ZPAY <span className="bg-gradient-to-r from-zinc-100 via-neutral-300 to-neutral-600 bg-clip-text text-transparent">MCP Server</span>
            </h1>
            <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl leading-relaxed font-medium">
              Connect AI models like Claude directly to the Stellar network. Build autonomous agents capable of sending, requesting, and escrowing funds.
            </p>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-16">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-32">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">On this page</h4>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${
                      activeSection === item.id 
                        ? 'bg-white/10 text-white font-semibold' 
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                    <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === item.id ? 'opacity-100' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'}`} />
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 max-w-3xl space-y-24">
            
            {/* Section 1: Introduction */}
            <section id="how-it-works" className="doc-section scroll-mt-32">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 text-white/80" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How it Works</h2>
              </div>
              <div className="prose prose-invert prose-neutral max-w-none">
                <p className="text-neutral-400 leading-relaxed text-lg">
                  The Model Context Protocol (MCP) bridges the gap between conversational AI (like Claude Desktop) and your ZPAY account. 
                  When you type <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-sm">Pay 50 XLM to div@Zp</code>, Claude uses the ZPAY MCP server to dynamically execute a Soroban smart contract transaction on your behalf.
                </p>
              </div>
            </section>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Section 2: Installation */}
            <section id="installation" className="doc-section scroll-mt-32">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                  <Terminal className="w-5 h-5 text-white/80" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Installation</h2>
              </div>
              <div className="prose prose-invert prose-neutral max-w-none mb-8">
                <p className="text-neutral-400 leading-relaxed text-lg">
                  To install the MCP server into Claude Desktop, you need to add the ZPAY executable to your Claude configuration file.
                </p>
              </div>
              
              <div className="relative w-full rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl overflow-hidden backdrop-blur-xl group">
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="h-12 border-b border-white/10 bg-white/[0.02] flex items-center px-4 gap-2 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                  <div className="flex-1 flex justify-center items-center gap-2 text-neutral-500 text-xs font-mono pr-10">
                    claude_desktop_config.json
                  </div>
                </div>
                <pre className="p-6 text-sm font-mono text-neutral-300 overflow-x-auto relative z-10">
{`{
  "mcpServers": {
    "zpay": {
      "command": "npx",
      "args": ["-y", "@zpay/mcp-server"],
      "env": {
        "ZPAY_API_KEY": "zp_live_your_api_key_here"
      }
    }
  }
}`}
                </pre>
              </div>
            </section>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Section 3: Available Tools */}
            <section id="tools" className="doc-section scroll-mt-32">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                  <Code2 className="w-5 h-5 text-white/80" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Exposed Tools</h2>
              </div>
              
              <div className="grid gap-4">
                {[
                  { name: 'send_p2p_payment', desc: 'Executes a direct payment to another ZPAY user.', params: 'recipient_id (string), amount (number), currency (string)' },
                  { name: 'create_escrow_contract', desc: 'Locks funds in a Soroban smart contract linked to a milestone.', params: 'freelancer_id (string), amount (number), terms (string)' },
                  { name: 'get_zpay_balance', desc: 'Fetches current balances in XLM and fiat equivalents.', params: 'none' }
                ].map((tool) => (
                  <div key={tool.name} className="group relative p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#D4AF37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-lg font-bold text-white mb-2 font-mono flex items-center gap-2">
                      <span className="text-[#D4AF37]">ƒ</span> {tool.name}
                    </h3>
                    <p className="text-neutral-400 text-sm mb-4 leading-relaxed">{tool.desc}</p>
                    <div className="text-xs font-mono text-neutral-500 bg-black p-3 rounded-lg border border-white/5">
                      <span className="text-neutral-600 mr-2">Params:</span> {tool.params}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Section 4: Security */}
            <section id="security" className="doc-section scroll-mt-32">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-5 h-5 text-white/80" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Security & Signatures</h2>
              </div>
              
              <div className="p-6 sm:p-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-transparent" />
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-amber-500/10 shrink-0">
                    <ShieldCheck className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-amber-500 font-bold mb-2">User-Approved Execution</h4>
                    <p className="text-amber-200/60 leading-relaxed text-sm sm:text-base">
                      The AI does not have raw access to your Stellar secret keys. 
                      When Claude attempts to execute a payment, the MCP server will create a pending transaction and return an approval link to the chat.
                      You must explicitly click the link and sign the transaction via your web dashboard to authorize the movement of funds.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>

      <FooterCTA />
    </main>
  );
}
