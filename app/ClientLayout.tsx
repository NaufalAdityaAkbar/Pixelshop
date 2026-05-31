"use client";
import React, { useEffect, useState } from 'react';

// Safe localStorage and sessionStorage polyfill for iframe preview & third-party storage limits
if (typeof window !== 'undefined') {
  let isLocalStorageAvailable = false;
  try {
    const test = "__test_local_storage__";
    window.localStorage.setItem(test, test);
    const retrieved = window.localStorage.getItem(test);
    window.localStorage.removeItem(test);
    if (retrieved === test) {
      isLocalStorageAvailable = true;
    }
  } catch (e) {
    isLocalStorageAvailable = false;
  }

  if (!isLocalStorageAvailable) {
    console.warn("localStorage is not accessible (likely blocked by iframe browser policy). Polyfilling safe storage fallbacks.");
    const store: Record<string, string> = {};
    const mockStorage: Storage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k in store) delete store[k]; },
      key: (index: number) => Object.keys(store)[index] || null,
      get length() { return Object.keys(store).length; }
    };
    try {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true,
        enumerable: true,
        writable: true
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        configurable: true,
        enumerable: true,
        writable: true
      });
    } catch (e) {
      console.warn("Unable to redefine window.localStorage. Overriding prototype methods instead.", e);
      try {
        if (typeof Storage !== 'undefined' && Storage.prototype) {
          const proto = Storage.prototype;
          const orgGetItem = proto.getItem;
          const orgSetItem = proto.setItem;
          const orgRemoveItem = proto.removeItem;
          const orgClear = proto.clear;

          proto.getItem = function(key) {
            try { return orgGetItem.call(this, key); } catch(err) { return store[key] || null; }
          };
          proto.setItem = function(key, value) {
            try { orgSetItem.call(this, key, value); } catch(err) { store[key] = String(value); }
          };
          proto.removeItem = function(key) {
            try { orgRemoveItem.call(this, key); } catch(err) { delete store[key]; }
          };
          proto.clear = function() {
            try { orgClear.call(this); } catch(err) { for (const k in store) delete store[k]; }
          };
        }
      } catch (protoErr) {
        console.error("Critical error polyfilling Storage prototype:", protoErr);
      }
    }
  }
}

import { AppProvider } from '@/src/context/AppContext';
import MainLayout from '@/src/components/layout/MainLayout';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-500 p-8 font-mono flex flex-col justify-center items-center">
          <h1 className="text-xl font-bold mb-4">React Render Error Catcher 🤖</h1>
          <p className="bg-zinc-900 border border-red-900 p-4 rounded max-w-2xl overflow-auto text-sm">
            {this.state.error?.stack || this.state.error?.message}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-sans font-medium"
          >
            Selesaikan Masalah & Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(true);
  
  // Removed useEffect that set mounted true, as we now default to true to fix the loading stuck issue.

  console.log("DEBUG: ClientLayout rendering, mounted state =", mounted);

  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="relative min-h-screen flex flex-col">
          <MainLayout>{children}</MainLayout>
          
          {/* Safe overlay loader that fades or unmounts cleanly once hydration / mount is complete */}
          {!mounted && (
            <div className="fixed inset-0 z-[9999] bg-[#0e0a08] flex flex-col justify-center items-center px-4 py-8">
              <div className="text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-t-[#facc15] border-r-[#facc15]/10 border-b-[#facc15]/10 border-l-[#facc15]/30 animate-spin" />
                </div>
                <h3 className="font-display font-medium text-lg text-[#f5e8d5] uppercase tracking-widest animate-pulse">PixelShop AI</h3>
                <p className="text-[#facc15]/80 font-mono text-xs tracking-wider bg-[#facc15]/10 px-4 py-1.5 rounded-full border border-[#facc15]/20 max-w-sm mx-auto">
                  Menyelaraskan Sesi Kreatif...
                </p>
                <button 
                  id="force-mount-btn"
                  onClick={() => {
                    console.log("DEBUG: Force mount button clicked!");
                    setMounted(true);
                  }} 
                  className="mt-4 px-3 py-1 bg-[#facc15] text-black rounded text-xs hover:bg-[#facc15]/80 font-mono uppercase font-bold"
                >
                  Buka Aplikasi (Force Mount)
                </button>
              </div>
            </div>
          )}
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

