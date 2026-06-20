"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { EtheralShadow } from '@/components/ui/etheral-shadow';

export default function GlobalBackground() {
  const pathname = usePathname();

  // Do not render on the landing page
  if (pathname === '/') return null;

  return (
    <div className="fixed inset-0 z-[0] pointer-events-none mix-blend-screen opacity-80">
      <EtheralShadow
        color="rgba(198, 148, 249, 0.5)"
        noise={{ opacity: 0.8, scale: 1.2 }}
        sizing="fill"
      />
    </div>
  );
}
