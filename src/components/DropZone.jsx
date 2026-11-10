import React, { useState } from 'react';
import { UploadCloud, Film, Image as ImageIcon, Music, Plus } from 'lucide-react';

export default function DropZone({ onFilesSelected, queueCount }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);

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
      className={`relative w-full max-w-[680px] min-h-[390px] h-[390px] mx-auto rounded-3xl p-8 sm:p-9 bg-slate-900/50 backdrop-blur-2xl border transition-all duration-300 text-center flex flex-col items-center justify-between overflow-hidden cursor-pointer group shadow-2xl ${
        isDragOver
          ? 'border-[var(--accent)] bg-accent-subtle scale-[1.01] glow-accent-lg'
          : 'border-white/10 hover:border-accent glow-accent'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent-glow)_0%,_transparent_65%)] opacity-15 pointer-events-none group-hover:opacity-25 transition duration-500" />

      {/* Top: Central icon cluster */}
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent flex items-center justify-center glow-accent shadow-xl group-hover:scale-105 transition duration-300">
          <UploadCloud className="w-7 h-7 text-accent transition-all duration-300 group-hover:-translate-y-0.5" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 p-1 rounded-lg bg-black/70 border border-accent text-accent">
          <Film className="w-3 h-3" />
        </div>
        <div className="absolute -bottom-1.5 -left-1.5 p-1 rounded-lg bg-black/70 border border-accent text-accent">
          <ImageIcon className="w-3 h-3" />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-lg bg-black/70 border border-accent text-accent">
          <Music className="w-3 h-3" />
        </div>
      </div>

      {/* Middle: Heading & Description */}
      <div className="flex flex-col items-center">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          Перетащите видео, фото или аудио файлы сюда
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
          Универсальный студийный конвертер форматов и умный компрессор медиа с аппаратным ускорением GPU: видео, фото, аудио и оптимизация веса под любые задачи.
        </p>
      </div>

      {/* Bottom: Action buttons & Format tags */}
      <div className="w-full flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              browseFiles('all');
            }}
            disabled={isBrowsing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider btn-accent cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Выбрать файлы на диске</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              browseFiles('video');
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-accent-subtle border border-white/10 hover:border-accent hover:text-white transition cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-accent-subtle border border-white/10 hover:border-accent hover:text-white transition cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-accent" />
            <span>Фото</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              browseFiles('audio');
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-accent-subtle border border-white/10 hover:border-accent hover:text-white transition cursor-pointer"
          >
            <Music className="w-3.5 h-3.5 text-accent" />
            <span>Аудио</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500">
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">MP4</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">MKV</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">MOV</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">WEBP</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">PNG</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">MP3</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">FLAC</span>
          <span className="text-slate-600">+ ещё 40 форматов</span>
        </div>
      </div>
    </div>
  );
}
