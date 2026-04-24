"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function Background() {
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring physics for the glowing orb following the mouse
  const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      // Move orb slightly in the direction of the mouse
      mouseX.set((clientX - innerWidth / 2) / 10);
      mouseY.set((clientY - innerHeight / 2) / 10);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 bg-black -z-10 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Main central rotating gradient */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[1000px] aspect-square rounded-full blur-[120px] md:blur-[200px]"
            style={{
              background: 'conic-gradient(from 0deg, rgba(198,148,249,0.1), rgba(148,161,249,0.15), rgba(245,167,196,0.1), rgba(198,148,249,0.1))'
            }}
          />

          {/* Mouse tracking orb */}
          <motion.div
            style={{ x: springX, y: springY }}
            className="absolute top-1/4 left-1/4 w-[40vw] max-w-[500px] aspect-square rounded-full bg-[#C694F9]/20 blur-[100px] md:blur-[150px]"
          />

          {/* Slow floating orb */}
          <motion.div
            animate={{ 
              y: ["-10%", "10%", "-10%"],
              x: ["-5%", "5%", "-5%"],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/3 right-1/4 w-[35vw] max-w-[400px] aspect-square rounded-full bg-[#94A1F9]/15 blur-[80px] md:blur-[120px]"
          />
        </div>
      )}
    </div>
  );
}
