"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PageId, Product, GeneratedContent, CalendarEvent, Achievement, AITrainerSettings, ShopInfo, UserSession, ConfirmDialogOptions } from '@/src/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_CALENDAR_EVENTS,
  DEFAULT_AI_TRAINER,
  DEFAULT_SHOP
} from '@/src/mockData';
import { getLevelName } from '@/src/utils';

interface Toast {
  id: string;
  text: string;
  sub?: string;
}

interface AppContextType {
  session: UserSession;
  shopInfo: ShopInfo;
  products: Product[];
  contents: GeneratedContent[];
  events: CalendarEvent[];
  achievements: Achievement[];
  aiTrainer: AITrainerSettings;
  toasts: Toast[];
  preselectedProduct: Product | null;
  confirmDialog: ConfirmDialogOptions;
  handleLogin: (newSession: UserSession) => void;
  updateShopInfo: (newShop: ShopInfo) => void;
  handleLogout: () => void;
  handleResetApp: () => void;
  addXP: (amount: number, message: string) => void;
  addProduct: (p: Omit<Product, 'id'>) => void;
  editProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  saveGeneratedContent: (g: Omit<GeneratedContent, 'id' | 'timestamp'>) => void;
  deleteGeneratedContent: (id: string) => void;
  addCalendarEvents: (newEvents: Omit<CalendarEvent, 'id'>[]) => void;
  checkOffPost: (id: string) => void;
  rescheduleEvent: (id: string, newDate: string, newTime: string) => void;
  deleteCalendarEvent: (id: string) => void;
  selectProductForTool: (product: Product, targetTool: PageId) => void;
  updateAiTrainer: (settings: Partial<AITrainerSettings>) => Promise<void>;
  triggerConfirm: (options: Omit<ConfirmDialogOptions, 'isOpen'>) => void;
  closeConfirm: () => void;
  isSyncing: boolean;
  syncMessage: string;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<UserSession>(() => {
    if (typeof window === 'undefined') return { email: '', isLoggedIn: false };
    const saved = localStorage.getItem('pixelshop_session');
    return saved ? JSON.parse(saved) : { email: '', isLoggedIn: false };
  });

  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => {
    if (typeof window === 'undefined') return DEFAULT_SHOP;
    const saved = localStorage.getItem('pixelshop_shopInfo');
    return saved ? JSON.parse(saved) : DEFAULT_SHOP;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === 'undefined') return INITIAL_PRODUCTS;
    const saved = localStorage.getItem('pixelshop_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [contents, setContents] = useState<GeneratedContent[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('pixelshop_contents');
    return saved ? JSON.parse(saved) : [];
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window === 'undefined') return INITIAL_CALENDAR_EVENTS;
    const saved = localStorage.getItem('pixelshop_events');
    return saved ? JSON.parse(saved) : INITIAL_CALENDAR_EVENTS;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    if (typeof window === 'undefined') return INITIAL_ACHIEVEMENTS;
    const saved = localStorage.getItem('pixelshop_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [aiTrainer, setAiTrainer] = useState<AITrainerSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_AI_TRAINER;
    const saved = localStorage.getItem('pixelshop_ai_trainer');
    return saved ? JSON.parse(saved) : DEFAULT_AI_TRAINER;
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [preselectedProduct, setPreselectedProduct] = useState<Product | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const triggerConfirm = (options: Omit<ConfirmDialogOptions, 'isOpen'>) => {
    setConfirmDialog({ ...options, isOpen: true });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('pixelshop_session', JSON.stringify(session));
  }, [session]);
  useEffect(() => {
    localStorage.setItem('pixelshop_shopInfo', JSON.stringify(shopInfo));
  }, [shopInfo]);
  useEffect(() => {
    localStorage.setItem('pixelshop_products', JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem('pixelshop_contents', JSON.stringify(contents));
  }, [contents]);
  useEffect(() => {
    localStorage.setItem('pixelshop_events', JSON.stringify(events));
  }, [events]);
  useEffect(() => {
    localStorage.setItem('pixelshop_achievements', JSON.stringify(achievements));
  }, [achievements]);
  useEffect(() => {
    localStorage.setItem('pixelshop_ai_trainer', JSON.stringify(aiTrainer));
  }, [aiTrainer]);

  // Load state from Supabase PostgreSQL on mount/login
  useEffect(() => {
    if (session.isLoggedIn && session.email) {
      fetch('/api/pixelshop/get-db-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email })
      })
      .then(res => res.json())
      .then(data => {
        if (data.new_user) {
          setShopInfo(prev => ({ ...prev, shopName: '' }));
        } else {
          if (data.shopInfo) setShopInfo(data.shopInfo);
          if (data.products) setProducts(data.products);
          if (data.contents) setContents(data.contents);
          if (data.events) setEvents(data.events);
          if (data.aiTrainer) setAiTrainer(data.aiTrainer);
        }
      })
      .catch(err => {
        console.warn("DB offline, using localStorage", err);
      });
    }
  }, [session.isLoggedIn, session.email]);

  const handleLogin = (newSession: UserSession) => {
    setSession(newSession);
    if (newSession.shopInfo) setShopInfo(newSession.shopInfo);
  };
  const updateShopInfo = (newShop: ShopInfo) => setShopInfo(newShop);
  const handleLogout = async () => {
    triggerConfirm({
      title: "Keluar dari Toko",
      message: "Apakah Anda yakin ingin keluar dari dashboard jualan Anda? Anda harus masuk kembali untuk mengelola produk dan konten Anda.",
      type: "warning",
      confirmText: "YA, KELUAR",
      cancelText: "BATAL",
      onConfirm: async () => {
        // Hapus semua cache lokal agar pengguna berikutnya tidak melihat data lama
        localStorage.clear();
        setSession({ email: '', isLoggedIn: false });
        
        // Coba signout dari NextAuth (jika berjalan di client)
        try {
          const { signOut } = await import("next-auth/react");
          await signOut({ redirect: false });
        } catch (err) {}

        window.location.href = '/';
      }
    });
  };
  const handleResetApp = async () => {
    // Delete account permanently from PostgreSQL Database
    if (session.email) {
      try {
        await fetch('/api/pixelshop/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.email })
        });
      } catch (err) {
        console.error("Gagal menghapus data dari database", err);
      }
    }

    localStorage.clear();
    setSession({ email: '', isLoggedIn: false });
    setShopInfo(DEFAULT_SHOP);
    setProducts(INITIAL_PRODUCTS);
    setContents([]);
    setEvents(INITIAL_CALENDAR_EVENTS);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setAiTrainer(DEFAULT_AI_TRAINER);

    try {
      const { signOut } = await import("next-auth/react");
      await signOut({ redirect: false });
    } catch (err) {}

    window.location.href = '/';
  };

  const addXP = (amount: number, message: string, streakOverride?: number) => {
    const nextXP = shopInfo.xp + amount;
    let nextLevel = shopInfo.level;
    if (nextXP >= 2000) nextLevel = 5;
    else if (nextXP >= 1500) nextLevel = 4;
    else if (nextXP >= 1000) nextLevel = 3;
    else if (nextXP >= 500) nextLevel = 2;
    else nextLevel = 1;

    let upMessage = '';
    if (nextLevel > shopInfo.level) {
      upMessage = `🎉 LEVEL UP! Kamu sekarang adalah "${getLevelName(nextXP)}"!`;
    }

    const nextStreak = streakOverride !== undefined ? streakOverride : shopInfo.streak;
    setShopInfo(prev => ({ ...prev, xp: nextXP, level: nextLevel, streak: nextStreak }));
    
    if (session.isLoggedIn && session.email) {
      fetch('/api/pixelshop/save-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          xp: nextXP,
          level: nextLevel,
          streak: nextStreak
        })
      }).catch(err => console.error("Gagal update XP ke DB:", err));
    }

    const addToast = (text: string, sub?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, text, sub }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    addToast(message, upMessage);

    checkAchievements(nextXP, products.length, contents.length + 1);
  };

  const checkAchievements = (xp: number, prodCount: number, contCount: number) => {
    setAchievements(prev =>
      prev.map(ach => {
        if (ach.unlocked) return ach;
        let curProgress = ach.progress;
        if (ach.id === 'ach-2') curProgress = contCount;
        else if (ach.id === 'ach-3') curProgress = prodCount;
        else if (ach.id === 'ach-6') curProgress = contCount;
        
        const isNowUnlocked = curProgress >= ach.target;
        if (isNowUnlocked) {
          setTimeout(() => {
            addXP(ach.xpReward, `🏆 Pencapaian Terbuka: ${ach.title.split(' ').slice(1).join(' ')}!`);
          }, 400);
        }
        return {
          ...ach,
          progress: curProgress,
          unlocked: isNowUnlocked,
          unlockedAt: isNowUnlocked ? new Date().toISOString() : undefined
        };
      })
    );
  };

  const addProduct = async (p: Omit<Product, 'id'>) => {
    const tempId = `prod-user-${Date.now()}`;
    const newProd = { ...p, id: tempId };
    
    setProducts(prev => {
      const updated = [...prev, newProd];
      checkAchievements(shopInfo.xp, updated.length, contents.length);
      return updated;
    });
    addXP(15, `Berhasil Daftarkan Produk "${newProd.name}"! (+15 XP)`);

    if (session.isLoggedIn && session.email) {
      setIsSyncing(true);
      setSyncMessage(`Menyinkronkan produk "${p.name}" ke PostgreSQL...`);
      try {
        const res = await fetch('/api/pixelshop/create-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.email,
            name: p.name,
            price: p.price,
            description: p.description,
            category: p.category,
            imageUrl: p.imageUrl || ''
          })
        });
        const data = await res.json();
        if (data.product) {
          setProducts(prev => prev.map(item => item.id === tempId ? { ...item, id: data.product.id } : item));
        }
      } catch (err) {
        console.error("Gagal menyimpan produk ke DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const editProduct = async (p: Product) => {
    setProducts(prev => prev.map(item => item.id === p.id ? p : item));

    if (session.isLoggedIn && session.email && !p.id.startsWith('prod-user-')) {
      setIsSyncing(true);
      setSyncMessage(`Memperbarui info produk "${p.name}" di PostgreSQL...`);
      try {
        await fetch('/api/pixelshop/update-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description,
            category: p.category,
            imageUrl: p.imageUrl || ''
          })
        });
      } catch (err) {
        console.error("Gagal mengupdate produk ke DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(item => item.id !== id));

    if (session.isLoggedIn && session.email && !id.startsWith('prod-user-')) {
      setIsSyncing(true);
      setSyncMessage('Menghapus produk dari PostgreSQL...');
      try {
        await fetch('/api/pixelshop/delete-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.error("Gagal menghapus produk dari DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const saveGeneratedContent = async (g: Omit<GeneratedContent, 'id' | 'timestamp'>) => {
    const tempId = `content-${Date.now()}`;
    const newContent = { ...g, id: tempId, timestamp: new Date().toISOString() };
    setContents(prev => [newContent, ...prev]);

    if (session.isLoggedIn && session.email) {
      try {
        const res = await fetch('/api/pixelshop/save-generated-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.email,
            toolType: g.type.toUpperCase().replace(/-/g, '_'),
            content: { title: g.title, text: g.content, extraInfo: g.extraInfo || "" },
            platform: g.platform || "",
            tone: g.extraInfo || "",
            isSaved: true
          })
        });
        const data = await res.json();
        if (data.content) {
          setContents(prev => prev.map(item => item.id === tempId ? { ...item, id: data.content.id } : item));
        }
      } catch (err) {
        console.error("Gagal menyimpan konten ke DB:", err);
      }
    }
  };

  const deleteGeneratedContent = async (id: string) => {
    setContents(prev => prev.filter(item => item.id !== id));

    if (session.isLoggedIn && session.email && !id.startsWith('content-')) {
      setIsSyncing(true);
      setSyncMessage('Menghapus riwayat konten dari PostgreSQL...');
      try {
        await fetch('/api/pixelshop/delete-generated-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.error("Gagal menghapus konten dari DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const addCalendarEvents = async (newEvents: Omit<CalendarEvent, 'id'>[]) => {
    const tempEvents = newEvents.map((ev, idx) => ({ ...ev, id: `ev-gen-${Date.now()}-${idx}` }));
    setEvents(prev => [...tempEvents, ...prev]);

    if (session.isLoggedIn && session.email) {
      setIsSyncing(true);
      setSyncMessage('Menyimpan jadwal konten baru ke PostgreSQL...');
      try {
        const res = await fetch('/api/pixelshop/save-calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.email,
            events: newEvents
          })
        });
        const data = await res.json();
        if (data.events) {
          // Replace temporary ids with DB ids
          setEvents(prev => {
            const clean = prev.filter(item => !tempEvents.some(te => te.id === item.id));
            return [...data.events, ...clean];
          });
        }
      } catch (err) {
        console.error("Gagal menyimpan agenda ke DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const checkOffPost = async (id: string) => {
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, status: 'done' as const } : ev));
    const nextStreak = shopInfo.streak + 1;
    addXP(20, 'Postingan dipublikasikan! Semoga rame orderan, Kak! (+20 XP)', nextStreak);

    if (session.isLoggedIn && session.email && !id.startsWith('ev-gen-')) {
      setIsSyncing(true);
      setSyncMessage('Menyimpan status upload ke PostgreSQL...');
      try {
        await fetch('/api/pixelshop/update-event-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'done' })
        });
      } catch (err) {
        console.error("Gagal update status agenda ke DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const rescheduleEvent = async (id: string, newDate: string, newTime: string) => {
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, date: newDate, time: newTime } : ev));

    if (session.isLoggedIn && session.email && !id.startsWith('ev-gen-')) {
      setIsSyncing(true);
      setSyncMessage('Memperbarui jadwal agenda di PostgreSQL...');
      try {
        await fetch('/api/pixelshop/reschedule-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, date: newDate, time: newTime })
        });
      } catch (err) {
        console.error("Gagal reschedule agenda ke DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const deleteCalendarEvent = async (id: string) => {
    setEvents(prev => prev.filter(item => item.id !== id));

    if (session.isLoggedIn && session.email && !id.startsWith('ev-gen-')) {
      setIsSyncing(true);
      setSyncMessage('Menghapus agenda dari PostgreSQL...');
      try {
        await fetch('/api/pixelshop/delete-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.error("Gagal menghapus agenda dari DB:", err);
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    }
  };

  const selectProductForTool = (product: Product, targetTool: PageId) => {
    setPreselectedProduct(product);
  };

  const updateAiTrainer = async (settings: Partial<AITrainerSettings>) => {
    let nextSettings = { ...aiTrainer, ...settings };
    setAiTrainer(nextSettings);
    if (session.isLoggedIn && session.email) {
      try {
        await fetch('/api/pixelshop/save-trainer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.email,
            aiCharacter: nextSettings.character,
            favoriteWords: nextSettings.favoriteWords,
            avoidWords: nextSettings.avoidWords,
            formalityLevel: nextSettings.formalityLevel,
            targetAge: nextSettings.targetAge,
            targetLocation: nextSettings.targetLocation,
            toneWarna: nextSettings.toneWarna || "emosional-hangat",
            exampleCaptions: nextSettings.sampleCaptions
          })
        });
      } catch (err) {
        console.error("Gagal menyimpan AI trainer ke DB:", err);
      }
    }
  };

  return (
    <AppContext.Provider value={{
      session, shopInfo, products, contents, events, achievements, aiTrainer, toasts, preselectedProduct, confirmDialog,
      handleLogin, updateShopInfo, handleLogout, handleResetApp, addXP, addProduct, editProduct,
      deleteProduct, saveGeneratedContent, deleteGeneratedContent, addCalendarEvents, checkOffPost,
      rescheduleEvent, deleteCalendarEvent, selectProductForTool, updateAiTrainer, triggerConfirm, closeConfirm,
      isSyncing, syncMessage
    }}>
      {children}
    </AppContext.Provider>
  );
};
