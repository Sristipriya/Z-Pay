"use client";

import { motion } from "framer-motion";

export function Background() {
  return (
    <div className="fixed inset-0 bg-black -z-10 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[40vw] max-w-[500px] aspect-square rounded-full bg-[#C694F9]/15 blur-[100px] md:blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[35vw] max-w-[400px] aspect-square rounded-full bg-[#94A1F9]/10 blur-[80px] md:blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] max-w-[800px] aspect-square rounded-full bg-gradient-to-br from-[#C694F9]/10 to-[#94A1F9]/10 blur-[120px] md:blur-[20px]" />
      </div>
    </div>
  );
}
