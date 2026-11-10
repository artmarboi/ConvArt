import React, { useEffect, useState } from 'react';
import { X, Film, Image as ImageIcon, Music, ExternalLink, HardDrive, AlertCircle, Play } from 'lucide-react';
import { formatBytes, formatDuration } from '../constants/presets';

export default function MediaPreviewModal({ item, onClose, onReveal }) {
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const mediaUrl = window.api && window.api.toMediaUrl ? window.api.toMediaUrl(item.filePath) : '';
  const isVideo = item.mediaType === 'video';
  const isImage = item.mediaType === 'image';
  const isAudio = item.mediaType === 'audio';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0b0e17] border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent-subtle text-accent border border-accent shrink-0 glow-accent">
              {isVideo ? <Film className="w-4 h-4" /> : isImage ? <ImageIcon className="w-4 h-4" /> : <Music className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate max-w-lg" title={item.fileName}>
                {item.fileName}
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span className="text-slate-200 font-semibold">{formatBytes(item.size)}</span>
                {item.duration > 0 && <span>• {formatDuration(item.duration)}</span>}
                {item.video?.width && <span>• {item.video.width}×{item.video.height}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onReveal(item.filePath)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              title="Открыть файл во внешнем плеере Windows или папке"
            >
              <HardDrive className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Файл на диске</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Content Viewport */}
        <div className="flex-1 flex items-center justify-center p-4 bg-black/80 overflow-hidden min-h-[350px]">
          {isImage && (
            <img
              src={mediaUrl}
              alt={item.fileName}
              className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl border border-white/5"
            />
          )}

          {isVideo && (
            <div className="relative w-full h-[65vh] flex items-center justify-center bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              {!videoError ? (
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                  <AlertCircle className="w-10 h-10 text-rose-400" />
                  <p className="text-sm text-slate-200">
                    Кодек контейнера не поддерживается браузерным плеером
                  </p>
                  <button
                    type="button"
                    onClick={() => onReveal(item.filePath)}
                    className="px-4 py-2 rounded-xl text-xs font-bold btn-accent cursor-pointer"
                  >
                    Открыть в плеере Windows
                  </button>
                </div>
              )}
            </div>
          )}

          {isAudio && (
            <div className="w-full max-w-lg p-8 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center gap-6 shadow-2xl">
              <div className="w-24 h-24 rounded-3xl bg-accent-subtle border border-accent flex items-center justify-center glow-accent-lg">
                <Music className="w-12 h-12 text-accent animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base truncate max-w-md">{item.fileName}</h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {item.audio?.codec?.toUpperCase() || 'AUDIO'} • {item.audio?.sampleRate || '44100'} Hz • {formatDuration(item.duration)}
                </p>
              </div>
              <audio src={mediaUrl} controls autoPlay className="w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
