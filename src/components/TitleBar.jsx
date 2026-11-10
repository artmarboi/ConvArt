import React from 'react';
import { Layers, Zap, Minus, Square, X, Palette, Sparkles, Download, RefreshCw, Settings } from 'lucide-react';
import { THEMES } from '../constants/presets';

export default function TitleBar({
  systemStatus,
  currentTheme,
  setTheme,
  activeTab,
  setActiveTab,
  onOpenSettings,
}) {
  const isElectron = typeof window !== 'undefined' && window.api;

  const handleMinimize = () => {
    if (window.api && window.api.minimize) window.api.minimize();
  };

  const handleMaximize = () => {
    if (window.api && window.api.maximize) window.api.maximize();
  };

  const handleClose = () => {
    if (window.api && window.api.close) window.api.close();
  };

  const hasGpu = systemStatus?.hardware?.nvenc || systemStatus?.hardware?.qsv || systemStatus?.hardware?.amf;

  return (
    <header className="relative h-12 w-full flex items-center justify-between px-4 select-none border-b border-white/5 bg-[#080b13]/90 backdrop-blur-md z-50 sticky top-0 [app-region:drag]">
      {/* Left: Brand ConvArt + Authorship + Navigation Tabs */}
      <div className="flex items-center gap-4 [app-region:no-drag]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-subtle border border-accent glow-accent">
            <Layers className="w-4 h-4 text-accent" />
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold tracking-tight text-lg leading-none">
              <span className="text-white">Conv</span>
              <span className="text-accent drop-shadow-[0_0_12px_var(--accent-glow)]">Art</span>
            </span>
            <span className="text-[10px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
              by artmarboi
            </span>
          </div>
        </div>

        {/* SoundCloud-Desktop style tab navigation */}
        <div className="hidden md:flex items-center gap-1 ml-3 p-1 rounded-xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'converter'
                ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Конвертер</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('downloader')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'downloader'
                ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Загрузчик из сети</span>
          </button>
        </div>
      </div>

      {/* Dead-Center: GPU Acceleration Badge (Mathematically centered) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center pointer-events-none">
        {hasGpu ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>GPU Аппаратное ускорение (NVENC)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Multi-Core CPU Studio</span>
          </div>
        )}
      </div>

      {/* Right: Theme Switcher & Window Controls */}
      <div className="flex items-center gap-3 [app-region:no-drag]">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                title={t.name}
                onClick={() => setTheme(t.id)}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 cursor-pointer ${
                  currentTheme === t.id
                    ? 'ring-2 ring-white scale-125 shadow-[0_0_10px_var(--accent)]'
                    : 'opacity-50 hover:opacity-100 hover:scale-110'
                }`}
                style={{ backgroundColor: t.color }}
              />
            ))}
          </div>
        </div>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer text-xs font-semibold"
          title="Настройки путей рендера по типам файлов"
        >
          <Settings className="w-3.5 h-3.5 text-accent" />
          <span className="hidden sm:inline">Настройки</span>
        </button>

        {isElectron && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Свернуть"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Развернуть"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
              title="Закрыть"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
