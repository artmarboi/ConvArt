import React, { useState } from 'react';
import { UploadCloud, Film, Image as ImageIcon, Music, Plus } from 'lucide-react';

export default function DropZone({
  onFilesSelected,
  queueCount,
  activeTab,
  setActiveTab,
  themeMode,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const isLight = themeMode === 'light';

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const filePaths = droppedFiles
        .map((f) => (window.api ? window.api.getPathForFile(f) : f.path))
        .filter(Boolean);

      if (filePaths.length > 0) {
        onFilesSelected(filePaths);
      }
    }
  };

  const browseFiles = async (type = 'all') => {
    setIsBrowsing(true);
    try {
      if (window.api && window.api.selectFiles) {
        const files = await window.api.selectFiles(type);
        if (files && files.length > 0) {
          onFilesSelected(files);
        }
      }
    } catch (err) {
      console.error('File browse error:', err);
    } finally {
      setIsBrowsing(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full max-w-[680px] min-h-[410px] h-[410px] mx-auto rounded-3xl p-8 sm:p-9 backdrop-blur-2xl border transition-all duration-300 text-center flex flex-col items-center justify-between overflow-hidden cursor-pointer group shadow-2xl ${
        isLight
          ? 'bg-white/80 border-slate-200/80 shadow-slate-200/50'
          : 'bg-slate-900/60 border-white/10'
      } ${
        isDragOver
          ? 'border-[var(--accent)] bg-accent-subtle scale-[1.01] glow-accent-lg'
          : 'hover:border-accent glow-accent'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent-glow)_0%,_transparent_65%)] opacity-15 pointer-events-none group-hover:opacity-25 transition duration-500" />

      {/* Top: Central icon cluster */}
      <div className="relative flex items-center justify-center mt-3">
        <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent flex items-center justify-center glow-accent shadow-xl group-hover:scale-105 transition duration-300">
          <UploadCloud className="w-7 h-7 text-accent transition-all duration-300 group-hover:-translate-y-0.5" />
        </div>
        <div className={`absolute -top-1.5 -right-1.5 p-1 rounded-lg border border-accent text-accent ${
          isLight ? 'bg-white/90' : 'bg-black/70'
        }`}>
          <Film className="w-3 h-3" />
        </div>
        <div className={`absolute -bottom-1.5 -left-1.5 p-1 rounded-lg border border-accent text-accent ${
          isLight ? 'bg-white/90' : 'bg-black/70'
        }`}>
          <ImageIcon className="w-3 h-3" />
        </div>
        <div className={`absolute -bottom-1.5 -right-1.5 p-1 rounded-lg border border-accent text-accent ${
          isLight ? 'bg-white/90' : 'bg-black/70'
        }`}>
          <Music className="w-3 h-3" />
        </div>
      </div>

      {/* Middle: Heading & Description */}
      <div className="flex flex-col items-center">
        <h2 className={`text-xl sm:text-2xl font-black tracking-tight mb-2 ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          Перетащите видео, фото или аудио файлы сюда
        </h2>
        <p className={`text-xs sm:text-sm max-w-lg leading-relaxed ${
          isLight ? 'text-slate-600' : 'text-slate-400'
        }`}>
          Универсальный студийный конвертер форматов и умный компрессор медиа с аппаратным ускорением GPU: видео, фото, аудио и оптимизация веса под любые задачи.
        </p>
      </div>

      {/* Bottom: Action buttons (Main button centered, secondary buttons below) & Format tags */}
      <div className="w-full flex flex-col items-center gap-3">
        {/* Main button centered in middle */}
        <div className="flex flex-col items-center justify-center gap-2.5 w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              browseFiles('all');
            }}
            disabled={isBrowsing}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider btn-accent cursor-pointer shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Выбрать файлы на диске</span>
          </button>

          {/* Underneath: Category filter buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                browseFiles('video');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                isLight
                  ? 'text-slate-700 bg-slate-100 hover:bg-accent-subtle hover:text-slate-900 border-slate-200/80 hover:border-accent'
                  : 'text-slate-300 bg-white/5 hover:bg-accent-subtle hover:text-white border-white/10 hover:border-accent'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-accent" />
              <span>Видео</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                browseFiles('image');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                isLight
                  ? 'text-slate-700 bg-slate-100 hover:bg-accent-subtle hover:text-slate-900 border-slate-200/80 hover:border-accent'
                  : 'text-slate-300 bg-white/5 hover:bg-accent-subtle hover:text-white border-white/10 hover:border-accent'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-accent" />
              <span>Фото & Графика</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                browseFiles('audio');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                isLight
                  ? 'text-slate-700 bg-slate-100 hover:bg-accent-subtle hover:text-slate-900 border-slate-200/80 hover:border-accent'
                  : 'text-slate-300 bg-white/5 hover:bg-accent-subtle hover:text-white border-white/10 hover:border-accent'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-accent" />
              <span>Аудио</span>
            </button>
          </div>
        </div>

        <div className={`flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono ${
          isLight ? 'text-slate-500' : 'text-slate-500'
        }`}>
          <span className={`px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>MP4</span>
          <span className={`px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>MKV</span>
          <span className={`px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>MOV</span>
          <span className={`px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>WEBP</span>
          <span className={`px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>PNG</span>
          <span className={`px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>MP3</span>
          <span className={`px-1.5 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>FLAC</span>
          <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>+ ещё 40 форматов</span>
        </div>
      </div>
    </div>
  );
}
