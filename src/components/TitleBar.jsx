import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar({
  title = 'Конвертер',
  themeMode,
}) {
  const isLight = themeMode === 'light';
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

  return (
    <header className={`h-14 w-full flex items-center justify-between px-6 select-none border-b z-10 [app-region:drag] transition-colors duration-200 ${
      isLight ? 'bg-white/40 border-slate-200/60' : 'bg-black/20 border-white/5'
    } backdrop-blur-md`}>
      {/* Current Page Title */}
      <div className="flex items-center gap-2 [app-region:no-drag]">
        <h1 className={`text-base font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {title}
        </h1>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1.5 [app-region:no-drag]">
        {isElectron && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight ? 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-900' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title="Свернуть"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight ? 'hover:bg-slate-200/80 text-slate-500 hover:text-slate-900' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
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
