/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ShoppingBag,
  Send,
  Copy,
  Calendar,
  Save,
  RotateCcw,
  Volume2,
  TrendingUp,
  MessageSquare,
  Search,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sliders,
  Award,
  Mic,
  X
} from 'lucide-react';
import { Product, PageId, GeneratedContent, CalendarEvent } from '../types';
import BubbleSkeletonLoader from './BubbleSkeletonLoader';
import { useAppContext } from '@/src/context/AppContext';
import { getAccessToken } from '../lib/workspaceAuth';
import { exportToGoogleCalendar } from '../lib/workspaceApis';

interface ToolsViewsProps {
  toolId: PageId; // 'caption_tool' | 'description_tool' | 'content_plan_tool' | 'chat_reply_tool' | 'competitor_tool'
  products: Product[];
  preselectedProduct: Product | null;
  onAddXP: (xp: number, message: string) => void;
  onSaveContent: (content: Omit<GeneratedContent, 'id' | 'timestamp'>) => void;
  onAddCalendarEvents: (events: Omit<CalendarEvent, 'id'>[]) => void;
  onNavigate: (page: PageId) => void;
  contents?: GeneratedContent[];
  onDeleteContent?: (id: string) => void;
  aiTrainer?: any;
}

export default function ToolsViews({
  toolId,
  products,
  preselectedProduct,
  onAddXP,
  onSaveContent,
  onAddCalendarEvents,
  onNavigate,
  contents = [],
  onDeleteContent,
  aiTrainer
}: ToolsViewsProps) {
  // Preselected product mapping or default first product
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.id);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [preselectedProduct, products]);

  const activeProduct = products.find((p) => p.id === selectedProductId) || null;

  // General States
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Tool 1: Caption Generator states
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'whatsapp' | 'shopee'>('instagram');
  const [tone, setTone] = useState<string>('santai');
  const [captionLength, setCaptionLength] = useState<'pendek' | 'sedang' | 'panjang'>('sedang');
  const [captionOutput, setCaptionOutput] = useState<string[] | null>(null);
  const [captionFullData, setCaptionFullData] = useState<any | null>(null);
  const [activeCaptionTab, setActiveCaptionTab] = useState(0);

  // Web Speech API states & hook
  const [customVoiceInstructions, setCustomVoiceInstructions] = useState('');
  const [customDescriptionInstructions, setCustomDescriptionInstructions] = useState('');
  const [customPlanInstructions, setCustomPlanInstructions] = useState('');
  const [customChatInstructions, setCustomChatInstructions] = useState('');
  const [customCompetitorInstructions, setCustomCompetitorInstructions] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<'instructions' | 'chatContext' | 'competitorName' | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const startVoiceRecognition = (target: 'instructions' | 'chatContext' | 'competitorName') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Perekam suara tidak didukung oleh browser Anda.');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'id-ID';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setListeningTarget(target);
        setSpeechError(null);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error', event?.error || event);
        let errMsg = event.error;
        if (event.error === 'not-allowed') errMsg = 'Izin Mic Ditolak. Harap izinkan di pengaturan browser.';
        else if (event.error === 'network') errMsg = 'Koneksi jaringan gagal. Pastikan browser Anda mendukung fitur perekaman suara (Disarankan Google Chrome).';
        
        setSpeechError(`Gagal rekam: ${errMsg}`);
        setIsListening(false);
        setListeningTarget(null);
        setTimeout(() => setSpeechError(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
        setListeningTarget(null);
      };

      recognition.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (resultText) {
          if (target === 'instructions') {
            setCustomVoiceInstructions((prev) => prev ? `${prev} ${resultText}` : resultText);
          } else if (target === 'chatContext') {
            setChatContext((prev) => prev ? `${prev} ${resultText}` : resultText);
          } else if (target === 'competitorName') {
            setCompetitorName((prev) => prev ? `${prev} ${resultText}` : resultText);
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      setSpeechError(`Mic gagal: ${err.message || err}`);
      setIsListening(false);
      setListeningTarget(null);
    }
  };

  // Tool 2: Description states
  const [marketplace, setMarketplace] = useState<'Shopee' | 'Tokopedia' | 'TikTok Shop'>('Tokopedia');
  const [seoFriendly, setSeoFriendly] = useState(true);
  const [descriptionOutput, setDescriptionOutput] = useState<{
    description: string;
    keywords: string[];
    tips: string;
  } | null>(null);

  // Tool 3: Weekly Content Plan states
  const [planOutput, setPlanOutput] = useState<
    Array<{
      day: string;
      title: string;
      format: string;
      time: string;
      platform: 'instagram' | 'tiktok' | 'whatsapp' | 'shopee' | 'tokopedia' | 'other';
      concept: string;
      caption: string;
    }> | null
  >(null);
  const [planAddedToCalendar, setPlanAddedToCalendar] = useState(false);

  // Tool 4: Chat Reply states
  const [chatSituation, setChatSituation] = useState('stok');
  const [chatContext, setChatContext] = useState('');
  const [chatOutput, setChatOutput] = useState<string[] | null>(null);

  // Tool 5: Competitor states
  const [competitorName, setCompetitorName] = useState('');
  const [competitorOutput, setCompetitorOutput] = useState<{
    usps: string[];
    marketingAngles: string[];
    competitorWeakness: string;
    actionPlan: string;
  } | null>(null);

  // Load outputs from cache on toolId change (accidental refresh persistence!)
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    (window as any).pixelshopHasUnsaved = !isSaved;
    return () => {
      (window as any).pixelshopHasUnsaved = false;
    };
  }, [isSaved]);

  useEffect(() => {
    // Reset state values
    setCaptionOutput(null);
    setCaptionFullData(null);
    setDescriptionOutput(null);
    setPlanOutput(null);
    setChatOutput(null);
    setCompetitorOutput(null);
    setPlanAddedToCalendar(false);
    setIsSaved(true);

    const cacheKey = `pixelshop_cache_${toolId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (toolId === 'caption_tool' && parsed.captions) {
          setCaptionOutput(parsed.captions);
          setCaptionFullData(parsed);
        } else if (toolId === 'description_tool' && parsed.description) {
          setDescriptionOutput(parsed);
        } else if (toolId === 'content_plan_tool' && parsed.plan) {
          setPlanOutput(parsed.plan);
        } else if (toolId === 'chat_reply_tool' && parsed.replies) {
          setChatOutput(parsed.replies);
        } else if (toolId === 'competitor_tool' && parsed.usps) {
          setCompetitorOutput(parsed);
        }
        
        const savedFlag = localStorage.getItem(`pixelshop_saved_${toolId}`);
        setIsSaved(savedFlag === 'true');
      } catch (e) {
        console.warn("Failed to load cached content", e);
      }
    }
  }, [toolId]);

  // Save handler triggered by button
  const handleSaveToHistory = () => {
    let savePayload: any = null;

    if (toolId === 'caption_tool' && captionOutput && captionFullData) {
      savePayload = {
        type: 'caption',
        title: `Caption ${platform.toUpperCase()} - ${activeProduct?.name || 'Produk'} (${tone})`,
        content: JSON.stringify({ output: captionOutput, fullData: captionFullData }),
        productId: activeProduct?.id,
        platform
      };
    } else if (toolId === 'description_tool' && descriptionOutput) {
      savePayload = {
        type: 'description',
        title: `Deskripsi ${marketplace} - ${activeProduct?.name || 'Produk'}`,
        content: JSON.stringify(descriptionOutput),
        productId: activeProduct?.id
      };
    } else if (toolId === 'content_plan_tool' && planOutput) {
      savePayload = {
        type: 'content-plan',
        title: `Kalender Rencana Mingguan - ${activeProduct?.name || 'Produk'}`,
        content: JSON.stringify(planOutput),
        productId: activeProduct?.id
      };
    } else if (toolId === 'chat_reply_tool' && chatOutput) {
      savePayload = {
        type: 'chat-reply',
        title: `Balasan CS: Situasi ${chatSituation.toUpperCase()}`,
        content: JSON.stringify(chatOutput),
        extraInfo: chatContext
      };
    } else if (toolId === 'competitor_tool' && competitorOutput) {
      savePayload = {
        type: 'competitor',
        title: `Analisis USP vs ${competitorName}`,
        content: JSON.stringify(competitorOutput),
        productId: activeProduct?.id,
        extraInfo: competitorName
      };
    }

    if (savePayload) {
      onSaveContent(savePayload);
      setIsSaved(true);
      localStorage.setItem(`pixelshop_saved_${toolId}`, 'true');
      ctx.triggerConfirm({
        title: 'Berhasil Disimpan!',
        message: 'Hasil formulasi telah berhasil disimpan ke Riwayat Konten.',
        type: 'success',
        confirmText: 'Lanjutkan'
      });
    }
  };

  // Copy helper
  const triggerCopy = (text: string, index: number | null = null) => {
    navigator.clipboard.writeText(text);
    if (index !== null) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1500);
    }
  };

  const ctx = useAppContext();
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const executeWithUnsavedCheck = (action: () => void) => {
    if (!isSaved) {
      ctx.triggerConfirm({
        title: 'Perubahan Belum Disimpan!',
        message: 'Tunggu! Anda belum menyimpan hasil formulasi sebelumnya ke Riwayat Konten. Apakah Anda yakin ingin membuangnya dan membuat formulasi baru?',
        type: 'warning',
        confirmText: 'Ya, Buang & Buat Baru',
        cancelText: 'Batal',
        onConfirm: action
      });
    } else {
      action();
    }
  };

  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  // Generate Handlers calling Backend server endpoints
  const generateCaption = () => {
    executeWithUnsavedCheck(async () => {
      setLoading(true);
      setCaptionOutput(null);
      setCaptionFullData(null);
      abortControllerRef.current = new AbortController();
      
      const shopName = localStorage.getItem('pixelshop_shopInfo')
        ? JSON.parse(localStorage.getItem('pixelshop_shopInfo')!).shopName
        : 'Toko Saya';

      try {
        const response = await fetch('/api/pixelshop/generate-caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            shopName,
            category: activeProduct?.category,
            brandVoice: 'ceria',
            aiCharacter: 'Sahabat Jualan',
            productName: activeProduct?.name,
            price: activeProduct?.price,
            productDesc: `${activeProduct?.description || ''}${customVoiceInstructions ? `\n\n[Instruksi Spesifik Pengguna atau Detail Tambahan]: ${customVoiceInstructions}` : ''}`,
            platform,
            tone,
            length: captionLength
          })
        });
        const data = await response.json();
        setCaptionOutput(data.captions);
        setCaptionFullData(data);

        // Save cache & state
        localStorage.setItem('pixelshop_cache_caption_tool', JSON.stringify(data));
        localStorage.setItem('pixelshop_saved_caption_tool', 'false');
        setIsSaved(false);

        // Award +10 XP
        onAddXP(10, 'Berhasil generate 3 Variasi Caption Jualan! (+10 XP)');

      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  };

  const generateDescription = () => {
    executeWithUnsavedCheck(async () => {
      setLoading(true);
      setDescriptionOutput(null);
      abortControllerRef.current = new AbortController();
      
      const shopName = localStorage.getItem('pixelshop_shopInfo')
        ? JSON.parse(localStorage.getItem('pixelshop_shopInfo')!).shopName
        : 'Toko Saya';

      try {
        const response = await fetch('/api/pixelshop/generate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            shopName,
            category: activeProduct?.category,
            productName: activeProduct?.name,
            price: activeProduct?.price,
            productDesc: `${activeProduct?.description || ''}${customDescriptionInstructions ? `\n\n[Instruksi Khusus / Data Latih]: ${customDescriptionInstructions}` : ''}`,
            marketplace,
            seoFriendly
          })
        });
        const data = await response.json();
        setDescriptionOutput(data);

        // Save cache & state
        localStorage.setItem('pixelshop_cache_description_tool', JSON.stringify(data));
        localStorage.setItem('pixelshop_saved_description_tool', 'false');
        setIsSaved(false);

        onAddXP(10, 'Sukses menyusun Deskripsi SEO Marketplace! (+10 XP)');

      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  };

  const generateContentPlan = () => {
    executeWithUnsavedCheck(async () => {
      setLoading(true);
      setPlanOutput(null);
      setPlanAddedToCalendar(false);
      abortControllerRef.current = new AbortController();

      const shopName = localStorage.getItem('pixelshop_shopInfo')
        ? JSON.parse(localStorage.getItem('pixelshop_shopInfo')!).shopName
        : 'Toko Saya';

      try {
        const response = await fetch('/api/pixelshop/generate-content-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            shopName,
            category: activeProduct?.category,
            productName: activeProduct?.name,
            productDesc: `${activeProduct?.description || ''}${customPlanInstructions ? `\n\n[Instruksi Khusus / Data Latih]: ${customPlanInstructions}` : ''}`
          })
        });
        const data = await response.json();
        setPlanOutput(data.plan);

        // Save cache & state
        localStorage.setItem('pixelshop_cache_content_plan_tool', JSON.stringify(data));
        localStorage.setItem('pixelshop_saved_content_plan_tool', 'false');
        setIsSaved(false);

        onAddXP(25, 'Super! Rencana Konten Mingguan Selesai Dibuat! (+25 XP)');

      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  };

  const commitPlanToCalendar = async () => {
    if (!planOutput) return;
    const today = new Date();
    const formattedEvents = planOutput.map((item, idx) => {
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + idx);
      const yyyy = eventDate.getFullYear();
      const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
      const dd = String(eventDate.getDate()).padStart(2, '0');

      return {
        title: item.title,
        date: `${yyyy}-${mm}-${dd}`,
        time: item.time,
        platform: item.platform,
        format: item.format,
        caption: item.caption,
        status: 'scheduled' as const
      };
    });

    onAddCalendarEvents(formattedEvents);
    setPlanAddedToCalendar(true);
    onAddXP(15, '7 Ide Konten Dimigrasikan ke Kalender Kerja! (+15 XP)');

    const token = getAccessToken();
    if (token) {
      try {
        let count = 0;
        for (const ev of formattedEvents) {
          await exportToGoogleCalendar(ev.title, ev.date, ev.time, ev.platform, ev.format, ev.caption || '');
          count++;
        }
        ctx.triggerConfirm({
          title: "Otomatis Tersinkron! 📅",
          message: `${count} agenda konten berhasil disinkronkan secara otomatis ke akun Google Workspace Anda!`,
          type: "success",
          confirmText: "Mantap!"
        });
      } catch (err) {
        console.error("Auto-sync Google Calendar failed:", err);
      }
    }
  };

  const generateChatReply = () => {
    executeWithUnsavedCheck(async () => {
      setLoading(true);
      setChatOutput(null);
      abortControllerRef.current = new AbortController();
      
      const shopName = localStorage.getItem('pixelshop_shopInfo')
        ? JSON.parse(localStorage.getItem('pixelshop_shopInfo')!).shopName
        : 'Toko Saya';

      try {
        const response = await fetch('/api/pixelshop/generate-chat-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            shopName,
            situation: chatSituation,
            context: `${chatContext || ''}${customChatInstructions ? `\n\n[Instruksi Khusus / Data Latih]: ${customChatInstructions}` : ''}`
          })
        });
        const data = await response.json();
        setChatOutput(data.replies);

        // Save cache & state
        localStorage.setItem('pixelshop_cache_chat_reply_tool', JSON.stringify(data));
        localStorage.setItem('pixelshop_saved_chat_reply_tool', 'false');
        setIsSaved(false);

        onAddXP(5, 'Template Balas Chat CS Selesai Dibuat! (+5 XP)');

      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  };

  const generateCompetitorAnalysis = () => {
    if (!competitorName.trim()) {
      ctx.triggerConfirm({
        title: 'Input Diperlukan',
        message: 'Tolong masukkan nama brand pesaing / kompetitor terlebih dahulu.',
        type: 'info',
        confirmText: 'Mengerti'
      });
      return;
    }
    executeWithUnsavedCheck(async () => {
      setLoading(true);
      setCompetitorOutput(null);
      abortControllerRef.current = new AbortController();
      
      const shopName = localStorage.getItem('pixelshop_shopInfo')
        ? JSON.parse(localStorage.getItem('pixelshop_shopInfo')!).shopName
        : 'Toko Saya';

      try {
        const response = await fetch('/api/pixelshop/generate-competitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            shopName,
            productName: activeProduct?.name,
            productDesc: `${activeProduct?.description || ''}${customCompetitorInstructions ? `\n\n[Instruksi Khusus / Data Latih]: ${customCompetitorInstructions}` : ''}`,
            competitorName
          })
        });
        const data = await response.json();
        setCompetitorOutput(data);

        // Save cache & state
        localStorage.setItem('pixelshop_cache_competitor_tool', JSON.stringify(data));
        localStorage.setItem('pixelshop_saved_competitor_tool', 'false');
        setIsSaved(false);

        onAddXP(15, 'Analisis Kompetitor & 5 Formulasi USP Terkunci! (+15 XP)');

      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  };

  if (products.length === 0 && toolId !== 'chat_reply_tool') {
    return (
      <div className="glass-card p-12 text-center text-brand-muted space-y-4">
        <div className="text-5xl">🛍️</div>
        <h3 className="font-extrabold text-lg text-brand-text">Belum Ada Produk Terdaftar</h3>
        <p className="text-xs max-w-sm mx-auto">
          Kamu harus mendaftarkan barang / produk di katalog terlebih dahulu sebelum memanggil asisten AI PixelShop.
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="btn-accent px-5 py-2.5 rounded shadow-md inline-flex items-center gap-1"
        >
          Buka Katalog Produk <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const getToolTitle = () => {
    switch (toolId) {
      case 'caption_tool':
        return { label: 'Kreasi Sosial', title: 'Asisten Pembuat Caption' };
      case 'description_tool':
        return { label: 'Struktur Dagang', title: 'Deskripsi SEO E-Commerce' };
      case 'content_plan_tool':
        return { label: 'Strategi Kampanye', title: 'Perencana Konten Mingguan' };
      case 'chat_reply_tool':
        return { label: 'Pelayanan Ramah', title: 'Template Balas Chat CS' };
      case 'competitor_tool':
        return { label: 'Riset Pasar', title: 'Analisis Celah Kompetitor' };
      default:
        return { label: 'PixelShop', title: 'Asisten Konten Generatif' };
    }
  };

  const toolHeader = getToolTitle();
  const hasGenerated = !!(captionOutput || descriptionOutput || planOutput || chatOutput || competitorOutput);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* PREMIUM TOOL HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-accent/25 bg-gradient-to-r from-[#1c1508] via-[#111827] to-brand-surface p-6">
        <div className="absolute top-0 right-0 w-72 h-40 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-24 w-48 h-32 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-accent/15 border border-brand-accent/30 rounded-xl shrink-0">
              <Sparkles className="w-6 h-6 text-brand-accent animate-pulse" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-script text-2xl text-brand-accent block select-none">{toolHeader.label}</span>
              <h1 className="text-xl md:text-2xl font-serif font-medium text-brand-text tracking-tight">{toolHeader.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeProduct && (
              <div className="flex items-center gap-2 bg-[#0d0a04] border border-brand-border/40 px-3 py-1.5 rounded-full">
                <ShoppingBag className="w-3 h-3 text-brand-accent" />
                <span className="text-[10px] font-mono text-brand-text truncate max-w-[140px]">{activeProduct.name}</span>
              </div>
            )}
            {aiTrainer && (
              <div className="flex items-center gap-1.5 bg-brand-accent/10 border border-brand-accent/25 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping" />
                <span className="text-[10px] font-mono text-brand-accent font-bold">AI: {aiTrainer.character}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full">
              <span className="text-[10px] font-mono text-emerald-400 font-bold">⚡ {toolId === 'caption_tool' ? '+10 XP' : toolId === 'description_tool' ? '+10 XP' : toolId === 'content_plan_tool' ? '+25 XP' : toolId === 'chat_reply_tool' ? '+5 XP' : '+15 XP'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: Input form parameter controls */}
        <div className="lg:col-span-5 h-full flex flex-col space-y-4">
          <div className={`glass-card p-5 transition-all duration-300 space-y-5 flex-1 flex flex-col justify-between ${
            hasGenerated 
              ? 'border-[#facc15]/50 bg-gradient-to-b from-[#1a1205]/45 to-transparent shadow-[0_0_15px_rgba(250,204,21,0.06)]' 
              : 'border-brand-accent/15'
          }`}>
            <div className="flex items-center justify-between border-b border-brand-border/30 pb-3">
              <div>
                <span className="text-[9px] font-mono text-brand-accent uppercase tracking-widest font-bold">Parameter Konfigurasi</span>
                <h2 className="text-base font-serif font-medium text-brand-text leading-tight">Pilihan Konten</h2>
              </div>
              <div className="p-2 bg-brand-accent/10 rounded-lg border border-brand-accent/20">
                <Sliders className="w-4 h-4 text-brand-accent" />
              </div>
            </div>

         {/* Input Product Dropdown - Hidden for Chat Tool */}
        {toolId !== 'chat_reply_tool' && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">PILIH PRODUK KATALOG</label>
            <select
              className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent transition-all duration-200"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Platform selection for tool options */}
        {toolId === 'caption_tool' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">PLATFORM TARGET</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'instagram', label: '📸 Instagram' },
                  { id: 'tiktok', label: '🎬 TikTok' },
                  { id: 'whatsapp', label: '💬 WhatsApp' },
                  { id: 'shopee', label: '🛒 Shopee' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id as any)}
                    className={`p-2.5 rounded-xl text-xs text-left border cursor-pointer transition-all duration-200 ${
                      platform === p.id
                        ? 'border-brand-accent bg-brand-accent/15 text-brand-text font-bold'
                        : 'border-brand-border/40 bg-transparent text-brand-muted hover:border-brand-accent/20'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">NADA / STYLE EMOSI</label>
              <select
                className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent transition-all duration-200"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="santai">😊 Santai & Akrab (Bestie style)</option>
                <option value="storytelling">📖 Storytelling (Kisah menyentuh)</option>
                <option value="skena">☕ Anak Skena (Indie, Coffee, Jaksel)</option>
                <option value="gen z">🔥 Gen Z (Fomo, Slay, Menyala Abangku)</option>
                <option value="emak-emak">👪 Emak-Emak WA (Peduli, Hemat, Bund)</option>
                <option value="luxury">💎 Luxury Brand (Mewah, Prestige, Elegan)</option>
                <option value="soft selling">🌸 Soft Selling (Informatif, Penasaran)</option>
                <option value="hard selling">⚡ Hard Selling (Promo Menggelegar, FOMO)</option>
                <option value="formal brand">💼 Formal Brand (Profesional, Rapi)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-brand-muted uppercase tracking-wider">
                <span>PANJANG CAPTION</span>
                <span className="text-brand-accent font-bold capitalize">{captionLength}</span>
              </div>
              <div className="flex gap-2.5">
                {['pendek', 'sedang', 'panjang'].map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setCaptionLength(len as any)}
                    className={`flex-1 py-2 rounded-xl text-xs border cursor-pointer transition-all duration-200 ${
                      captionLength === len
                        ? 'border-brand-accent bg-brand-accent/20 text-brand-text font-bold'
                        : 'border-brand-border/40 text-brand-muted hover:border-brand-accent/15'
                    }`}
                  >
                    {len === 'pendek' ? 'Pdk' : len === 'sedang' ? 'Sdg' : 'Pjg'}
                  </button>
                ))}
              </div>
            </div>

            {/* VOX LABS: Integrated Voice Dictation Workspace (Web Speech API) */}
            <div className="space-y-2 border-t border-brand-border/20 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold text-brand-muted flex items-center gap-1.5 uppercase tracking-wide">
                  <Mic className="w-3.5 h-3.5 text-brand-accent shrink-0 animate-pulse" /> Instruksi Branding Suara (Bicara 🎙️)
                </label>
                <div className="flex gap-2">
                  {customVoiceInstructions && (
                    <button
                      type="button"
                      onClick={() => setCustomVoiceInstructions('')}
                      className="text-[10px] text-brand-muted hover:text-brand-text underline transition cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                  <span className="text-[9px] font-mono text-brand-muted bg-[#131b2e] border border-brand-border/30 px-1.5 py-0.5 rounded uppercase">
                    Speech API
                  </span>
                </div>
              </div>

              <div className="relative">
                <textarea
                  className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl p-3.5 pr-10 text-xs text-brand-text focus:outline-none focus:border-brand-accent min-h-[70px] placeholder:text-brand-muted/50 leading-relaxed transition-all duration-200"
                  placeholder="Klik tombol mic jualan disamping untuk bicara / mendikte instruksi promo, diskon, atau info khas jualan Anda secara praktis..."
                  value={customVoiceInstructions}
                  onChange={(e) => setCustomVoiceInstructions(e.target.value)}
                />
                
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('instructions')}
                  className={`absolute right-2.5 bottom-2.5 p-2 rounded-full cursor-pointer transition-all duration-300 shadow-md ${
                    isListening && listeningTarget === 'instructions'
                      ? 'bg-emerald-500 text-brand-bg animate-pulse ring-4 ring-emerald-500/20'
                      : 'bg-[#131b2e] border border-brand-accent/30 hover:bg-brand-accent/20 text-brand-accent'
                  }`}
                  title={isListening && listeningTarget === 'instructions' ? 'Sedang merekam suara... (Klik untuk berhenti)' : 'Mulai rekam suara jualan'}
                >
                  <Mic className={`w-3.5 h-3.5 ${isListening && listeningTarget === 'instructions' ? 'scale-110 text-white' : ''}`} />
                </button>
              </div>

              {isListening && listeningTarget === 'instructions' && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>Sistem merekam suara... Silakan dengungkan promosi jualan Anda!</span>
                </div>
              )}

              {speechError && (
                <div className="text-[10px] text-amber-500 font-mono">
                  ⚠️ {speechError}
                </div>
              )}
            </div>

            <button
              onClick={generateCaption}
              disabled={loading}
              className="btn-accent w-full py-3.5 rounded-lg flex items-center justify-center gap-2 text-sm font-extrabold shadow-md mt-6"
            >
              {loading ? (
                <>⚙️ Memproses Formulasi AI...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Formulasikan Caption! (+10 XP)
                </>
              )}
            </button>
          </div>
        )}

        {/* Platform selection for DESCRIPTION tool */}
        {toolId === 'description_tool' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">PILIH MARKETPLACE</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['Shopee', 'Tokopedia', 'TikTok Shop'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMarketplace(m as any)}
                    className={`py-2.5 rounded-xl text-[10px] font-extrabold text-center border cursor-pointer transition-all duration-200 ${
                      marketplace === m
                        ? 'border-brand-accent bg-brand-accent/15 text-brand-text font-bold'
                        : 'border-brand-border/40 bg-transparent text-brand-muted hover:border-brand-accent/20'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-brand-surface2 rounded-xl border border-brand-border/30">
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-brand-text">Keyword SEO Friendly</span>
                <span className="block text-[10px] text-brand-muted">Sertakan rekomendasi tagar teratas</span>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 accent-brand-accent rounded cursor-pointer"
                checked={seoFriendly}
                onChange={(e) => setSeoFriendly(e.target.checked)}
              />
            </div>

            {/* DATA LATIH / INSTRUKSI KHUSUS SEO DESCRIPTION */}
            <div className="space-y-1.5 border-t border-brand-border/20 pt-4">
              <label className="block text-[10px] font-mono text-brand-text flex items-center gap-1.5 uppercase tracking-wide">
                🧠 DATA LATIH / INSTRUKSI SEO KUSTOM
              </label>
              <textarea
                className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-brand-accent min-h-[60px] placeholder:text-brand-muted/50"
                placeholder="Tulis instruksi khusus SEO atau spesifikasi teknis tambahan (cth: sertakan ukuran jumbo, berat 500gr, dsb)..."
                value={customDescriptionInstructions}
                onChange={(e) => setCustomDescriptionInstructions(e.target.value)}
              />
            </div>

            <button
              onClick={generateDescription}
              disabled={loading}
              className="btn-accent w-full py-3.5 rounded-lg flex items-center justify-center gap-2 text-sm font-extrabold mt-2"
            >
              {loading ? <>⚙️ Menyusun Deskripsi...</> : <><Sparkles className="w-4 h-4" /> Buat Deskripsi SEO (+10 XP)</>}
            </button>
          </div>
        )}

        {/* Parameters for Content Plan tool */}
        {toolId === 'content_plan_tool' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-brand-surface2 border border-brand-border/30 rounded-xl space-y-2">
              <span className="block text-[10px] font-mono tracking-wider text-brand-accent font-bold">INFO AKURASI</span>
              <p className="text-xs text-brand-muted leading-relaxed">
                AI akan merumuskan 7 ide konten kreatif untuk seminggu penuh sesuai jam posting ramai pembeli di Indonesia.
              </p>
            </div>

            {/* DATA LATIH / INSTRUKSI KHUSUS CONTENT PLAN */}
            <div className="space-y-1.5 border-t border-brand-border/20 pt-4">
              <label className="block text-[10px] font-mono text-brand-text flex items-center gap-1.5 uppercase tracking-wide">
                🧠 DATA LATIH / STRATEGI KONTEN KUSTOM
              </label>
              <textarea
                className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-brand-accent min-h-[60px] placeholder:text-brand-muted/50"
                placeholder="Tulis instruksi khusus marketing atau tema kampanye (cth: fokus promo Gajian, campaign kemerdekaan, dsb)..."
                value={customPlanInstructions}
                onChange={(e) => setCustomPlanInstructions(e.target.value)}
              />
            </div>

            <button
              onClick={generateContentPlan}
              disabled={loading}
              className="btn-accent w-full py-3.5 rounded-lg flex items-center justify-center gap-2 font-extrabold mt-2"
            >
              {loading ? <>⚙️ Menghitung Hari...</> : <><Sparkles className="w-4 h-4" /> Susun Rencana Mingguan (+25 XP)</>}
            </button>
          </div>
        )}

        {/* Parameters for Chat Reply tool */}
        {toolId === 'chat_reply_tool' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">SITUASI CHAT MASUK</label>
              <select
                className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent transition-all duration-200"
                value={chatSituation}
                onChange={(e) => setChatSituation(e.target.value)}
              >
                <option value="Tanya Ketersediaan Stok">🛍️ Menanyakan stok produk</option>
                <option value="Nego Harga / Tawar Diskon">💰 Menawar harga jualan</option>
                <option value="Komplain Barang Rusak / Salah Kirim">⚠️ Komplain & Keluhan</option>
                <option value="Ucapan Terima Kasih (Selesai Pembelian)">❤️ Ucapkan Terima Kasih</option>
                <option value="Follow-Up Pembayarannya yang Tertunda">⏰ Follow-up Tagihan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">KONTEKS TAMBAHAN (OPSIONAL)</label>
                <div className="flex gap-1.5 items-center">
                  <span className="text-[9px] font-mono text-brand-muted uppercase bg-[#131b2e] px-1.5 py-0.5 rounded border border-brand-border/30">Voice Dictate 🎙️</span>
                </div>
              </div>
              <div className="relative">
                <textarea
                  rows={3}
                  className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl p-3.5 pr-10 text-xs text-brand-text focus:outline-none focus:border-brand-accent placeholder:text-brand-muted/45 leading-relaxed transition-all duration-200"
                  placeholder="Misal: Sisa 3 pcs lagi, beri voucher diskon 5% dst... ATAU klik mic jualan dan suarakan langsung!"
                  value={chatContext}
                  onChange={(e) => setChatContext(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('chatContext')}
                  className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                    isListening && listeningTarget === 'chatContext'
                      ? 'bg-emerald-500 text-brand-bg animate-pulse ring-4 ring-emerald-500/20'
                      : 'bg-[#131b2e] border border-brand-accent/20 hover:bg-brand-accent/15 text-brand-accent'
                  }`}
                  title={isListening && listeningTarget === 'chatContext' ? 'Merekam konteks... (Klik untuk berhenti)' : 'Diktekkan konteks chat'}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
              {isListening && listeningTarget === 'chatContext' && (
                <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  Mendengarkan konteks balasan chat...
                </p>
              )}
            </div>

            {/* DATA LATIH / INSTRUKSI KHUSUS CHAT REPLY */}
            <div className="space-y-1.5 border-t border-brand-border/20 pt-4">
              <label className="block text-[10px] font-mono text-brand-text flex items-center gap-1.5 uppercase tracking-wide">
                🧠 DATA LATIH / ATURAN RESEP CS KUSTOM
              </label>
              <textarea
                className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-brand-accent min-h-[60px] placeholder:text-brand-muted/50"
                placeholder="Tulis aturan kustom bagi CS (cth: jangan sebut refund uang tapi ganti barang baru, sebutkan nama pelanggan, dsb)..."
                value={customChatInstructions}
                onChange={(e) => setCustomChatInstructions(e.target.value)}
              />
            </div>

            <button
              onClick={generateChatReply}
              disabled={loading}
              className="btn-accent w-full py-3.5 rounded-lg flex items-center justify-center gap-2 font-extrabold mt-2"
            >
              {loading ? <>⚙️ Menyalin Nada CS...</> : <><Sparkles className="w-4 h-4" /> Buat Balasan Ramah (+5 XP)</>}
            </button>
          </div>
        )}

        {/* Parameters for Competitor USP tool */}
        {toolId === 'competitor_tool' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">NAMA BRAND PESAING / KOMPETITOR</label>
                <span className="text-[9px] font-mono text-brand-muted uppercase bg-[#131b2e] px-1.5 py-0.5 rounded border border-brand-border/30">Voice Dictate 🎙️</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl px-3.5 pr-10 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent placeholder:text-brand-muted/45 transition-all duration-200"
                  placeholder="Contoh: Basreng Istiqomah / Toko Sebelah"
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('competitorName')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                    isListening && listeningTarget === 'competitorName'
                      ? 'bg-emerald-500 text-brand-bg animate-pulse ring-4 ring-emerald-500/20'
                      : 'bg-[#131b2e] border border-brand-accent/20 hover:bg-brand-accent/15 text-brand-accent'
                  }`}
                  title={isListening && listeningTarget === 'competitorName' ? 'Merekam... (Klik untuk berhenti)' : 'Dikte nama brand pesaing'}
                >
                  <Mic className="w-3 h-3" />
                </button>
              </div>
              {isListening && listeningTarget === 'competitorName' && (
                <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  Mengeja nama brand pesaing...
                </p>
              )}
            </div>

            {/* DATA LATIH / INSTRUKSI KHUSUS COMPETITOR USP */}
            <div className="space-y-1.5 border-t border-brand-border/20 pt-4">
              <label className="block text-[10px] font-mono text-brand-text flex items-center gap-1.5 uppercase tracking-wide">
                🧠 DATA LATIH / PANDUAN RISET KUSTOM
              </label>
              <textarea
                className="w-full bg-[#090e1a] border border-brand-border/40 rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-brand-accent min-h-[60px] placeholder:text-brand-muted/50"
                placeholder="Tulis kelebihan atau kelemahan spesifik kompetitor (cth: mereka jual lebih murah tapi plastik tipis, rasa kurang gurih, dsb)..."
                value={customCompetitorInstructions}
                onChange={(e) => setCustomCompetitorInstructions(e.target.value)}
              />
            </div>

            <button
              onClick={generateCompetitorAnalysis}
              disabled={loading}
              className="btn-accent w-full py-3.5 rounded-lg flex items-center justify-center gap-2 font-extrabold mt-2"
            >
              {loading ? <>⚙️ Membandingkan Pasar...</> : <><Sparkles className="w-4 h-4" /> Mulai Analisis USP (+15 XP)</>}
            </button>
          </div>
        )}
        </div>
        </div>

      {/* RIGHT COLUMN: Interactive Generation Output Panels */}
      <div className="lg:col-span-7 h-full flex flex-col space-y-4">
        <div className="flex justify-between items-center bg-gradient-to-r from-brand-surface to-[#0d1220] border border-brand-border/40 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-brand-accent/15 rounded-lg">
              <Sparkles className="w-4 h-4 text-brand-accent" />
            </div>
            <div>
              <span className="block text-[9px] font-mono text-brand-muted uppercase tracking-wider">Output Editor</span>
              <h3 className="text-sm font-bold text-brand-text">Hasil Formulasi Genius AI</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {copiedText && <span className="text-xs text-emerald-400 font-bold animate-pulse">✓ Berhasil disalin!</span>}
            {hasGenerated && (
              <button
                onClick={handleSaveToHistory}
                disabled={isSaved}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  isSaved
                    ? 'bg-brand-success/10 border border-brand-success/30 text-brand-success shadow-none cursor-default'
                    : 'bg-[#facc15] hover:bg-[#facc15]/95 text-brand-bg shadow-[0_0_15px_rgba(250,204,21,0.25)] hover:scale-105 active:scale-95'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {isSaved ? 'Tersimpan' : 'Simpan ke Riwayat'}
              </button>
            )}
          </div>
        </div>

        {/* SKELETON LOADING VIEW RENDER */}
        {loading && (
          <div className="flex-1 flex flex-col relative items-center justify-center min-h-[300px]">
            <BubbleSkeletonLoader />
            <div className="absolute bottom-10 z-10">
              <button
                onClick={handleCancelGenerate}
                className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Batal / Berhenti Generate
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE - Rich with contextual hints */}
        {!loading &&
          !captionOutput &&
          !descriptionOutput &&
          !planOutput &&
          !chatOutput &&
          !competitorOutput && (
            <div className="glass-card border border-brand-border/20 overflow-hidden flex-1 flex flex-col justify-between">
              <div className="flex-1 flex flex-col justify-center">
                {/* Top decorative gradient */}
                <div className="h-1 bg-gradient-to-r from-brand-accent/40 via-brand-accent to-brand-accent/40" />
                <div className="p-10 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-brand-accent/20 rounded-3xl blur-xl animate-pulse" />
                      <div className="relative p-5 bg-brand-accent/10 border border-brand-accent/30 rounded-2xl">
                        <Sparkles className="w-10 h-10 text-brand-accent" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-serif font-medium text-brand-text">Menunggu Formulasi Anda</h3>
                    <p className="text-sm text-brand-muted/80 max-w-xs mx-auto leading-relaxed">
                      Pilih parameter di bagian kiri lalu tekan tombol formulasikan untuk memanggil asisten AI Toko PixelShop Anda.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                {/* CONTEXTUAL QUICK TIPS GRID */}
                <div className="border-t border-brand-border/20 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-brand-border/15">
                  {[
                    { icon: '⚡', title: 'Siap Generate', desc: 'Semua parameter sudah terisi otomatis dari katalog produkmu' },
                    { icon: '🧠', title: 'AI Terlatih', desc: aiTrainer ? `Brand Voice: "${aiTrainer.character}" aktif & siap dipakai` : 'Latih AI Trainer untuk hasil yang lebih personal' },
                    { icon: '📋', title: 'Langsung Salin', desc: 'Hasil AI bisa langsung disalin ke media sosial atau marketplace' }
                  ].map((tip, i) => (
                    <div key={i} className="p-4 text-center space-y-1.5 bg-brand-surface/10">
                      <span className="text-2xl block">{tip.icon}</span>
                      <span className="block text-xs font-bold text-brand-text">{tip.title}</span>
                      <p className="text-[11px] text-brand-muted/70 leading-relaxed">{tip.desc}</p>
                    </div>
                  ))}
                </div>

                {/* ACTIVE PRODUCT PREVIEW */}
                {activeProduct && (
                  <div className="border-t border-brand-border/20 p-4 bg-brand-surface/30">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-brand-accent/15 border border-brand-accent/25 rounded-xl flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 text-brand-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] font-mono text-brand-muted uppercase tracking-wider">Produk Terpilih</span>
                        <span className="block text-xs font-bold text-brand-text truncate">{activeProduct.name}</span>
                      </div>
                      <span className="text-xs font-bold text-brand-accent font-mono shrink-0">
                        Rp {activeProduct.price?.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* 1. RENDER OUTPUT CAPTION GENERATOR */}
        {!loading && captionOutput && (
          <div className="flex-1 flex flex-col">
            {/* Primary Variations Card */}
            <div id="variation-card" className={`glass-card p-6 md:p-8 space-y-6 relative overflow-hidden transition-all duration-300 flex flex-col justify-between flex-1 ${
              hasGenerated 
                ? 'border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] animate-fade-in' 
                : 'border-brand-accent/30 shadow-lg'
            }`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-brand-border/30 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-[#facc15] font-extrabold tracking-widest uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-ping" />
                    ● HASIL FORMULASI UTAMA
                  </span>
                  <h3 className="text-lg font-serif font-medium text-brand-text">Pilihan Variasi Caption Jualan</h3>
                </div>
                {/* Tabs for 3 variations */}
                <div className="flex gap-2">
                  {captionOutput.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveCaptionTab(idx)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        activeCaptionTab === idx
                          ? 'bg-[#facc15] text-brand-bg shadow-md'
                          : 'border border-brand-border/30 text-brand-muted hover:bg-brand-accent/10 hover:text-brand-text'
                      }`}
                    >
                      <span>Variasi</span> #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1c1305]/60 border border-[#facc15]/20 shadow-inner p-5 rounded-xl space-y-4 font-sans text-brand-text select-all leading-relaxed whitespace-pre-line text-sm font-medium my-4 flex-1">
                {captionOutput[activeCaptionTab]}
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  onClick={() => triggerCopy(captionOutput[activeCaptionTab])}
                  className="px-5 py-3 border border-brand-border text-brand-text hover:border-brand-accent/50 rounded-lg text-xs font-bold flex items-center gap-2 transition bg-brand-surface/20 hover:bg-brand-surface/50 cursor-pointer flex-1 justify-center"
                >
                  <Copy className="w-4 h-4" /> Salin Caption Terpilih
                </button>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="px-5 py-3 bg-brand-surface2 hover:bg-brand-surface border border-brand-border/30 hover:border-brand-accent/40 text-brand-text rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer flex-1 justify-center"
                >
                  <Calendar className="w-4 h-4 text-brand-accent" strokeWidth={1.5} /> Jadwalkan Posting
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. RENDER OUTPUT DESCRIPTION GENERATOR */}
        {!loading && descriptionOutput && (
          <div className="flex-1 flex flex-col">
            <div className={`glass-card p-6 md:p-8 space-y-6 transition-all duration-300 flex flex-col justify-between flex-1 ${
              hasGenerated 
                ? 'border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] animate-fade-in' 
                : 'border-brand-accent/30 shadow-lg'
            }`}>
              <div className="space-y-2 flex-1 flex flex-col">
                <span className="text-[10px] font-mono text-[#facc15] font-extrabold tracking-wider block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-ping" />
                  📋 DESKRIPSI PRODUK UTAMA
                </span>
                <div className="bg-[#1c1305]/60 border border-[#facc15]/20 shadow-inner p-5 rounded-xl text-xs text-brand-text leading-relaxed whitespace-pre-line flex-1 min-h-[180px] max-h-[320px] overflow-y-auto select-all">
                  {descriptionOutput.description}
                </div>
              </div>

              <button
                onClick={() => triggerCopy(descriptionOutput.description)}
                className="mt-4 px-5 py-3 border border-brand-border text-brand-text hover:border-brand-accent/60 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition bg-brand-surface/20 w-full"
              >
                <Copy className="w-4 h-4" /> Salin Seluruh Deskripsi
              </button>
            </div>
          </div>
        )}

        {/* 3. RENDER OUTPUT WEEKLY PLAN GENERATOR */}
        {!loading && planOutput && (
          <div className="flex-1 flex flex-col">
            <div className={`glass-card p-6 transition-all duration-300 flex flex-col justify-between flex-1 space-y-6 ${
              hasGenerated 
                ? 'border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] animate-fade-in' 
                : 'border-brand-accent/30 shadow-lg'
            }`}>
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-[#facc15] font-extrabold uppercase tracking-wider block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-ping" />
                  📅 JADWAL STRATEGIS
                </span>
                <h3 className="font-bold text-base text-brand-text">7 Rencana Posting Hump Jualan</h3>
                <p className="text-xs text-brand-muted leading-relaxed">
                  Rencana publikasi terstruktur selama 7 hari penuh telah diformulasikan untuk menjamin konsistensi performa tokomu.
                </p>
              </div>
              <button
                onClick={commitPlanToCalendar}
                disabled={planAddedToCalendar}
                className={`w-full py-3.5 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  planAddedToCalendar
                    ? 'bg-brand-success/15 border border-brand-success/30 text-brand-success cursor-default'
                    : 'btn-accent shadow-md'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {planAddedToCalendar ? '✓ Berhasil Dimigrasikan!' : 'Masukkan Semua ke Kalender'}
              </button>
            </div>
          </div>
        )}

        {/* 4. RENDER OUTPUT CHAT REPLY GENERATOR */}
        {!loading && chatOutput && (
          <div className="flex-1 flex flex-col">
            <div className={`glass-card p-6 md:p-8 space-y-6 transition-all duration-300 flex flex-col justify-between flex-1 ${
              hasGenerated 
                ? 'border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] animate-fade-in' 
                : 'border-brand-accent/30 shadow-lg'
            }`}>
              <h3 className="font-bold text-sm text-[#facc15] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-ping" />
                2 Pilihan Respon Draf Balasan
              </h3>

              <div className="grid grid-cols-1 gap-4 flex-1">
                {chatOutput.map((reply, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-[#1c1305]/60 border border-[#facc15]/20 shadow-inner hover:border-[#facc15]/40 rounded-2xl flex flex-col justify-between gap-4 text-xs tracking-wide leading-relaxed"
                  >
                    <p className="text-brand-text select-all whitespace-pre-line italic">"{reply}"</p>
                    <button
                      onClick={() => triggerCopy(reply, idx)}
                      className="w-full py-2 bg-brand-surface border border-brand-border/30 rounded hover:border-brand-accent/55 font-bold font-mono text-[10px] flex items-center justify-center gap-1.5 uppercase transition"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copiedIndex === idx ? 'SALIN BERHASIL' : 'SALIN BALASAN'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. RENDER OUTPUT COMPETITOR ANALYST */}
        {!loading && competitorOutput && (
          <div className="flex-1 flex flex-col">
            <div className={`glass-card p-6 md:p-8 space-y-6 transition-all duration-300 flex flex-col justify-between flex-1 ${
              hasGenerated 
                ? 'border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] animate-fade-in' 
                : 'border-brand-accent/30 shadow-lg'
            }`}>
              <div className="space-y-3 flex-1">
                <span className="text-[10px] font-mono text-[#facc15] font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-ping" />
                  🏆 5 Unique Selling Points (USP) Pembeda
                </span>
                <div className="space-y-2">
                  {competitorOutput.usps.map((usp, i) => (
                    <div key={i} className="flex gap-2 p-3 bg-[#1c1305]/60 border border-[#facc15]/20 shadow-inner rounded-lg text-xs leading-relaxed">
                      <span className="text-[#facc15] font-black">{i + 1}.</span>
                      <p className="text-brand-text">{usp}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => triggerCopy(competitorOutput.usps.join('\n') + '\n\n' + competitorOutput.actionPlan)}
                className="mt-4 px-5 py-3 border border-brand-border text-brand-text hover:border-brand-accent/50 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 w-full transition bg-brand-surface/20"
              >
                <Copy className="w-4 h-4" /> Salin Ringkasan Strategi
              </button>
            </div>
          </div>
        )}
      </div>{/* end right column */}
      </div>{/* end grid */}

      {/* FULL WIDTH SECONDARY WIDGETS BELOW BOTH COLUMNS */}
      {hasGenerated && (
        <div className="space-y-6 pt-2">
          
          {/* Caption Tool secondary widgets */}
          {!loading && captionOutput && captionFullData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* WIDGET A: Slide-by-Slide Carousel Script */}
                {captionFullData.carousel && captionFullData.carousel.length > 0 && (
                  <div id="carousel-widget" className="glass-card p-6 border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center border-b border-brand-border/30 pb-2.5">
                        <span className="text-[10px] font-mono text-[#facc15] font-bold tracking-wider uppercase flex items-center gap-1.5">📝 NASKAH CAROUSEL SLIDE</span>
                        <span className="text-[9px] font-mono text-brand-muted px-2 py-0.5 border border-brand-border/30 rounded-full">Interactive Slide</span>
                      </div>
                      <p className="text-[11px] text-brand-muted mt-2 mb-4 leading-relaxed">
                        Gunakan skrip per slide ini untuk membuat layout multi-image di Instagram Feed atau video slide di TikTok:
                      </p>
                      <div className="space-y-3.5">
                        {captionFullData.carousel.map((item: any, i: number) => (
                          <div key={i} className="p-3 bg-[#110c0a] border border-brand-border/40 rounded-lg space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-brand-accent font-extrabold font-serif">Slide {item.slide || i + 1}</span>
                              <span className="text-[9px] font-mono text-amber-600/90 font-bold">Ide Visual</span>
                            </div>
                            <p className="text-xs text-brand-text leading-relaxed font-sans font-medium">“{item.text}”</p>
                            <span className="block text-[10px] text-brand-muted font-sans italic pt-1 border-t border-brand-border/10 font-medium">💡 {item.notes}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const compiled = captionFullData.carousel.map((c: any) => `Slide ${c.slide}: ${c.text} (Visual: ${c.notes})`).join('\n\n');
                        triggerCopy(compiled);
                      }}
                      className="w-full mt-4 py-2 border border-brand-border hover:border-brand-accent/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 text-brand-text bg-brand-surface/10 hover:bg-brand-surface/40"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin Naskah Carousel
                    </button>
                  </div>
                )}

                {/* WIDGET B: Powerful Hook Alternatives */}
                {captionFullData.hooks && captionFullData.hooks.length > 0 && (
                  <div id="hooks-widget" className="glass-card p-6 border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_15px_rgba(250,204,21,0.04)] space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center border-b border-brand-border/30 pb-2.5">
                        <span className="text-[10px] font-mono text-[#facc15] font-bold tracking-wider uppercase flex items-center gap-1.5">🧲 PILIHAN HOOK PENGIKAT (PROMO)</span>
                        <span className="text-[9px] font-mono text-brand-accent px-2 py-0.5 border border-brand-accent/20 rounded-full bg-brand-accent/5">STOP SCROLLING</span>
                      </div>
                      <p className="text-[11px] text-brand-muted mt-2 mb-4 leading-relaxed">
                        Ganti 1-2 baris pertama postinganmu dengan formula pembuka psikologis ini untuk melipatgandakan retensi audiens:
                      </p>
                      <div className="space-y-3">
                        {captionFullData.hooks.map((item: any, i: number) => (
                          <div key={i} className="p-3 bg-brand-surface/20 border border-brand-border/30 rounded-lg space-y-1 relative group hover:border-[#facc15]/40 transition">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono font-bold capitalize text-brand-accent px-2 py-0.5 bg-brand-accent/10 border border-brand-accent/15 rounded">
                                Formula {item.type || 'Pancingan'}
                              </span>
                              <button
                                onClick={() => triggerCopy(item.text)}
                                className="text-brand-muted hover:text-brand-accent p-0.5 rounded transition animate-none"
                                title="Salin Hook"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs text-brand-text leading-relaxed font-sans pt-1 font-medium">“{item.text}”</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* WIDGET C: High-Intensity CTAs Triggers */}
              {captionFullData.ctas && captionFullData.ctas.length > 0 && (
                <div id="cta-widget" className="glass-card p-6 border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] space-y-4">
                  <div className="flex justify-between items-center border-b border-brand-border/30 pb-2.5">
                    <span className="text-[10px] font-mono text-[#facc15] font-bold tracking-wider uppercase">🎯 TEMPLATE CTA PENUTUP GACOR</span>
                    <span className="text-[9px] font-mono text-green-500 font-bold">Conversion Rate (CR) Up</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {captionFullData.ctas.map((cta: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-[#110c0a] border border-brand-border/40 rounded-xl space-y-2 flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-mono font-extrabold text-[#8AC98A]">
                            💡 CTA {cta.type || 'Fokus'}
                          </span>
                          <p className="text-xs text-brand-text leading-relaxed font-sans font-medium">“{cta.text}”</p>
                        </div>
                        <button
                          onClick={() => triggerCopy(cta.text)}
                          className="mt-3.5 w-full py-1.5 border border-brand-border/60 hover:border-[#8AC98A]/50 font-sans hover:bg-[#8AC98A]/5 text-[10px] text-brand-muted hover:text-brand-text rounded-md font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Copy className="w-3 h-3" /> Salin CTA
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WIDGET D: A/B Testing Draft Choices */}
              {captionFullData.abTesting && (
                <div id="ab-testing-widget" className="glass-card p-6 border border-[#facc15]/30 bg-gradient-to-b from-[#1c1305] via-[#0d0903] to-[#140e04] shadow-[0_0_20px_rgba(250,204,21,0.08)] space-y-4">
                  <div className="flex justify-between items-center border-b border-brand-border/30 pb-2.5">
                    <span className="text-[10px] font-mono text-[#facc15] font-bold tracking-wider uppercase">📊 DIAGRAM A/B TESTING DRAFT</span>
                    <span className="text-[9px] font-mono text-amber-500 font-bold">PILIH SENSASI KAMU</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    {/* Version A: Soft Story */}
                    <div className="p-4 bg-[#110c0a] border border-brand-border/30 rounded-xl space-y-3 flex flex-col justify-between relative overflow-hidden">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded uppercase font-mono tracking-widest text-[9px]">
                            VERSI A (Soft Selling)
                          </span>
                          <span className="text-[9px] text-brand-muted font-mono font-medium">Warm & Storytelling</span>
                        </div>
                        <p className="text-xs text-brand-muted leading-relaxed whitespace-pre-line text-left font-medium select-all">
                          {captionFullData.abTesting.versionA}
                        </p>
                      </div>
                      <button
                        onClick={() => triggerCopy(captionFullData.abTesting.versionA)}
                        className="mt-4 w-full py-2 bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/20 text-blue-300 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" /> Gunakan Versi Soft Story
                      </button>
                    </div>

                    {/* Version B: Hard FOMO */}
                    <div className="p-4 bg-[#110c0a] border border-brand-border/30 rounded-xl space-y-3 flex flex-col justify-between relative overflow-hidden">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold bg-[#8AC98A]/10 text-[#8AC98A] border border-[#8AC98A]/20 px-2 py-0.5 rounded uppercase font-mono tracking-widest text-[9px]">
                            VERSI B (Hard Selling)
                          </span>
                          <span className="text-[9px] text-brand-muted font-mono font-medium">FOMO & FOMO Style</span>
                        </div>
                        <p className="text-xs text-brand-muted leading-relaxed whitespace-pre-line text-left font-medium select-all font-sans">
                          {captionFullData.abTesting.versionB}
                        </p>
                      </div>
                      <button
                        onClick={() => triggerCopy(captionFullData.abTesting.versionB)}
                        className="mt-4 w-full py-2 bg-[#8AC98A]/5 hover:bg-[#8AC98A]/15 border border-[#8AC98A]/20 text-[#8AC98A] rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" /> Gunakan Versi Hard FOMO
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* WIDGET E: Hashtags AI analysis result */}
              {captionFullData.hashtags && captionFullData.hashtags.length > 0 && (
                <div id="hashtag-widget" className="glass-card p-4 border border-brand-border/40 bg-brand-surface/40 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 text-left flex-1">
                    <span className="block text-[9px] font-mono text-brand-accent font-bold uppercase tracking-wider">🏷️ HASHTAG REKOMENDASI AI</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {captionFullData.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-brand-accent/5 hover:bg-brand-accent/10 border border-brand-accent/15 rounded-md text-[10px] text-brand-text font-mono transition select-all font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => triggerCopy(captionFullData.hashtags.join(' '))}
                    className="px-4 py-2 bg-brand-surface text-brand-text hover:text-brand-accent border border-brand-border hover:border-brand-accent/30 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-center"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin Semua Hashtag
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Description Tool secondary widgets */}
          {!loading && descriptionOutput && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-brand-surface border border-brand-border/30 rounded-xl space-y-3">
                <span className="block text-[10px] font-mono text-[#8AC98A] font-bold">⚡ STRATEGI KEYWORDS</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {descriptionOutput.keywords.map((kw, i) => (
                    <span key={i} className="px-2.5 py-1.5 bg-brand-accent/10 border border-brand-accent/25 rounded text-[10px] text-brand-accent font-mono">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-brand-surface border border-brand-border/35 rounded-xl space-y-2">
                <span className="block text-[10px] font-mono text-amber-500 font-bold">💡 TIPS MARKETING MARKETPLACE</span>
                <p className="text-xs text-brand-muted leading-relaxed">{descriptionOutput.tips}</p>
              </div>
            </div>
          )}

          {/* Plan Tool secondary day cards */}
          {!loading && planOutput && (
            <div className="space-y-4">
              {planOutput.map((item, index) => (
                <div
                  key={index}
                  className="glass-card p-5 border border-brand-border/30 flex flex-col md:flex-row gap-4 justify-between hover:border-[#facc15]/40 transition duration-150"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-brand-accent text-brand-bg text-[10px] font-mono font-black rounded uppercase">
                        {item.day}
                      </span>
                      <span className="text-[10px] font-mono text-brand-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {item.time} WIB
                      </span>
                      <span className="text-[10px] text-brand-accent font-bold font-mono">
                        {item.platform?.toUpperCase()} • {item.format}
                      </span>
                    </div>

                    <div className="font-extrabold text-sm text-brand-text">{item.title}</div>
                    <div className="text-xs text-brand-muted/90 bg-[#090e1a] p-3 rounded-lg border border-brand-border/20">
                      <strong className="text-brand-accent block text-[10px] uppercase font-mono mb-1">Konsep Video:</strong>
                      {item.concept}
                    </div>

                    <p className="text-xs text-brand-muted italic bg-brand-surface2/40 px-3 py-2 rounded">
                      🎬 "{item.caption}"
                    </p>
                  </div>

                  <div className="flex md:flex-col justify-end gap-1.5 md:border-l md:border-brand-border/20 md:pl-4 min-w-[130px]">
                    <button
                      onClick={() => triggerCopy(`${item.title}\n\n${item.concept}\n\n${item.caption}`, index)}
                      className="p-2 border border-brand-border rounded flex items-center justify-center gap-1 hover:border-brand-accent/40 text-[10px] text-brand-text flex-1 md:flex-none"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copiedIndex === index ? 'Selesai' : 'Salin Ide'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Competitor Tool secondary widgets */}
          {!loading && competitorOutput && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-brand-surface border border-brand-border/30 rounded-xl space-y-3">
                <span className="block text-[10px] font-mono text-[#8AC98A] font-bold uppercase tracking-wider">📢 CHYPER MARKETING ANGLES</span>
                <ul className="space-y-2.5">
                  {competitorOutput.marketingAngles.map((angle, idx) => (
                    <li key={idx} className="text-xs text-brand-muted leading-relaxed pl-2 border-l-2 border-brand-accent font-medium">
                      {angle}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 bg-brand-surface border border-brand-border/35 rounded-xl space-y-3">
                <div className="space-y-1">
                  <span className="block text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider">Celah Pasar / Kelemahan Lawan</span>
                  <p className="text-xs text-brand-muted leading-relaxed">{competitorOutput.competitorWeakness}</p>
                </div>
                <div className="space-y-1 pt-2 border-t border-brand-border/20">
                  <span className="block text-[10px] font-mono text-brand-success font-bold uppercase tracking-wider">Langkah Aksi Taktis</span>
                  <p className="text-xs text-brand-muted leading-relaxed">{competitorOutput.actionPlan}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SECTION: DOKUMEN & INTEGRASI — FULL WIDTH BELOW BOTH COLUMNS */}
      <div className="glass-card p-6 border-brand-accent/20 space-y-6" style={{background: 'linear-gradient(135deg, rgba(250,204,21,0.04) 0%, transparent 60%)'}}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-border/30 pb-4">
            <div>
              <span className="block text-[10px] font-mono text-brand-accent font-extrabold uppercase tracking-widest">📁 DOKUMEN & INTEGRASI</span>
              <h3 className="text-base font-serif font-medium text-brand-text">Arsip Generasi & Data Latih AI</h3>
            </div>
            {aiTrainer && (
              <span className="text-[10px] bg-brand-accent/15 text-brand-accent border border-brand-accent/20 px-2.5 py-1 rounded-full font-mono font-bold">
                🧠 Trained: {aiTrainer.character}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COLUMN 1: WADAH RIWAYAT AI TERPILIH */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5 font-mono uppercase tracking-wide">
                📜 Riwayat Generasi AI Ini
              </h4>
              
              {(() => {
                const targetType = toolId === 'caption_tool' ? 'caption' : 
                                   toolId === 'description_tool' ? 'description' : 
                                   toolId === 'content_plan_tool' ? 'content-plan' : 
                                   toolId === 'chat_reply_tool' ? 'chat-reply' : 'competitor';
                
                const filteredContents = contents.filter(c => c.type === targetType);
                
                if (filteredContents.length === 0) {
                  return (
                    <div className="p-5 bg-[#090e1a] border border-brand-border/20 rounded-xl text-center text-brand-muted text-[11px] leading-relaxed">
                      Belum ada arsip copy jualan khusus untuk alat AI ini. Hasilkan satu di atas!
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {filteredContents.map((c) => {
                      let cleanPreview = '';
                      try {
                        const parsed = JSON.parse(c.content);
                        if (Array.isArray(parsed)) cleanPreview = typeof parsed[0] === 'object' ? JSON.stringify(parsed[0]) : parsed[0];
                        else if (typeof parsed === 'object') cleanPreview = parsed.description || parsed.previewText || JSON.stringify(parsed);
                        else cleanPreview = c.content;
                      } catch (_) {
                        cleanPreview = c.content;
                      }

                      return (
                        <div key={c.id} className="p-3 bg-[#090e1a] border border-brand-border/30 rounded-lg space-y-2 hover:border-brand-accent/20 transition group">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono font-bold text-brand-accent line-clamp-1">{c.title}</span>
                            <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition">
                              <button 
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(cleanPreview);
                                  alert('Arsip disalin!');
                                }}
                                className="text-brand-text hover:text-brand-accent p-0.5 rounded cursor-pointer"
                                title="Salin"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              {onDeleteContent && (
                                <button 
                                  type="button"
                                  onClick={() => onDeleteContent(c.id)}
                                  className="text-brand-muted hover:text-red-400 p-0.5 rounded cursor-pointer"
                                  title="Hapus"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-brand-muted/95 line-clamp-2 italic leading-relaxed">
                            "{cleanPreview}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* COLUMN 2: BRAND VOICE DATA LATIH UTAMA */}
            <div className="space-y-4 md:border-l md:border-brand-border/20 md:pl-6">
              <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5 font-mono uppercase tracking-wide">
                🧠 Status & Sampel Data Latih Toko
              </h4>

              {aiTrainer ? (
                <div className="p-4 bg-[#090e1a] border border-brand-border/30 rounded-xl space-y-3.5 text-xs text-brand-muted leading-relaxed font-sans font-medium">
                  <div className="space-y-1">
                    <span className="block text-[10px] uppercase font-mono font-extrabold text-brand-accent">Identitas & Karakter Suara</span>
                    <p className="text-brand-text text-[11px]">"{aiTrainer.character}" — Level Keformalan {aiTrainer.formalityLevel || 2}/5</p>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] uppercase font-mono font-extrabold text-brand-accent">Kata Emas Langganan</span>
                    <p className="text-brand-text text-[11px] font-mono">{aiTrainer.favoriteWords || 'Kak, Bestie, Checkout'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] uppercase font-mono font-extrabold text-[#8AC98A]">Sampel Latihan Andalan</span>
                    <p className="text-brand-text italic text-[11px] line-clamp-2">
                      "{aiTrainer.sampleCaptions?.[0] || 'Sstt.. khusus follower setia ada rahasia diskon super hemat malam ini.'}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-brand-border/10 flex justify-between items-center text-[10px]">
                    <span>Target: {aiTrainer.targetAge}</span>
                    <button 
                      type="button"
                      onClick={() => onNavigate('ai_trainer' as any)} 
                      className="text-brand-accent font-extrabold hover:underline"
                    >
                      Latih Ulang AI →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-[#090e1a] border border-brand-border/20 rounded-xl text-center text-brand-muted text-[11px] leading-relaxed">
                  Belum ada profil brand voice terdaftar. Silakan kunjungi menu AI Trainer untuk melatih kecerdasan asisten tokomu.
                </div>
              )}
            </div>
          </div>
        </div>

    </motion.div>
  );
}
