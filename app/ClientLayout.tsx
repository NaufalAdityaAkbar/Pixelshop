"use client";
import React, { useEffect, useState } from 'react';
import { AppProvider } from '@/src/context/AppContext';
import MainLayout from '@/src/components/layout/MainLayout';
import { SessionProvider } from "next-auth/react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a simple fallback before hydration to avoid mismatch
    return <div className="min-h-screen bg-[#1c1410]" />;
  }

  return (
    <SessionProvider>
      <AppProvider>
        <MainLayout>{children}</MainLayout>
      </AppProvider>
    </SessionProvider>
  );
}
