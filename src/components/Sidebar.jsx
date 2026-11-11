import React from 'react';
import { Layers, RefreshCw, Download, Settings, Zap, Sparkles, FolderSync, ShieldCheck } from 'lucide-react';
import iconDark from '../assets/convart-icon-dark.png';
import iconLight from '../assets/convart-icon-light.png';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenSettings,
  systemStatus,
  themeMode,
  queueCount = 0,
}) {
  const isLight = themeMode === 'light';
  const hasGpu = systemStatus?.hardware?.nvenc || systemStatus?.hardware?.qsv || systemStatus?.hardware?.amf;

  return (
    <aside
      className={`w-60 sm:w-64 flex-shrink-0 flex flex-col justify-between h-full border-r select-none transition-colors duration-200 z-20 ${
        isLight
          ? 'bg-white/80 border-slate-200/80 text-slate-800'
          : 'bg-[#090c15]/90 border-white/5 text-slate-200'
      } backdrop-blur-2xl`}
    >
      {/* Top: Logo & Branding with drag region */}
      <div>
        <div className="h-14 px-5 flex items-center gap-3 border-b border-transparent [app-region:drag]">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10 glow-accent transition-transform hover:scale-105">
            <img
              src={isLight ? iconLight : iconDark}
              alt="ConvArt"
              className="w-full h-full object-cover select-none pointer-events-none rounded-xl"
            />
          </div>

          <div className="flex flex-col [app-region:no-drag]">
            <div className="flex items-center gap-1.5 leading-none">
              <span className={`font-extrabold text-base tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Conv<span className="text-accent drop-shadow-[0_0_10px_var(--accent-glow)]">Art</span>
              </span>
              <span className={`text-[9px] font-mono uppercase px-1 py-0.5 rounded border ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10'
              }`}>
                Studio
              </span>
            </div>
            <span className={`text-[10px] font-medium tracking-tight mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              by artmarboi
            </span>
          </div>
        </div>

        {/* Navigation Items (Vertical Rectangular Buttons) */}
        <nav className="p-3 space-y-1.5 [app-region:no-drag]">
          <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Навигация
          </div>

          {/* 1. Converter */}
          <button
            type="button"
            onClick={() => setActiveTab('converter')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'converter'
                ? 'bg-accent-subtle text-accent border border-accent glow-accent shadow-sm'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <RefreshCw className={`w-4 h-4 ${activeTab === 'converter' ? 'text-accent' : ''}`} />
              <span>Конвертер</span>
            </div>
            {queueCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-accent text-slate-950 font-black">
                {queueCount}
              </span>
            )}
          </button>

          {/* 2. Web Downloader */}
          <button
            type="button"
            onClick={() => setActiveTab('downloader')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'downloader'
                ? 'bg-accent-subtle text-accent border border-accent glow-accent shadow-sm'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Download className={`w-4 h-4 ${activeTab === 'downloader' ? 'text-accent' : ''}`} />
              <span>Загрузчик из сети</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isLight ? 'bg-slate-200/60 text-slate-600 border-slate-300/60' : 'bg-white/5 text-slate-400 border-white/5'
            }`}>
              4K/DoH
            </span>
          </button>

          {/* Divider */}
          <div className={`my-2 border-t ${isLight ? 'border-slate-200/70' : 'border-white/5'}`} />

          <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Система
          </div>

          {/* 3. Rectangular Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/90 border border-slate-200/60 hover:border-accent'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-white/5 hover:border-accent'
            }`}
          >
            <Settings className="w-4 h-4 text-accent transition-transform duration-200 group-hover:rotate-45" />
            <span>Настройки</span>
          </button>
        </nav>
      </div>

      {/* Bottom: Hardware Acceleration + Version Info */}
      <div className={`p-4 border-t space-y-3 [app-region:no-drag] ${isLight ? 'border-slate-200/70' : 'border-white/5'}`}>
        {/* GPU Acceleration pill */}
        <div className={`p-2.5 rounded-2xl border flex items-center gap-2.5 ${
          hasGpu
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : isLight
              ? 'bg-slate-100 border-slate-200 text-slate-600'
              : 'bg-white/5 border-white/5 text-slate-400'
        }`}>
          {hasGpu ? (
            <>
              <Zap className="w-4 h-4 fill-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold leading-tight truncate">GPU Ускорение</div>
                <div className="text-[9px] font-mono text-emerald-500/80 leading-none">NVIDIA NVENC</div>
              </div>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold leading-tight truncate">CPU Режим</div>
                <div className="text-[9px] font-mono opacity-80 leading-none">Multi-Threaded</div>
              </div>
            </>
          )}
        </div>

        {/* Authorship & Version */}
        <div className="flex items-center justify-between text-[11px]">
          <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            ConvArt
          </span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
            isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10'
          }`}>
            v1.0.7
          </span>
        </div>
      </div>
    </aside>
  );
}
