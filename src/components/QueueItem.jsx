import React, { useState } from 'react';
import {
  Film, Image as ImageIcon, Music, Play, CheckCircle2,
  AlertCircle, X, Sliders, FolderOpen, RefreshCw, Eye, Scissors
} from 'lucide-react';
import { FORMAT_OPTIONS, PRESETS, formatBytes, formatDuration } from '../constants/presets';

export default function QueueItem({
  item,
  onUpdateFormat,
  onUpdatePreset,
  onOpenInspector,
  onStartSingle,
  onCancel,
  onRemove,
  onReveal,
  onPreview,
  onOpenTrimmer,
  themeMode,
}) {
  const isLight = themeMode === 'light';
  const isVideo = item.mediaType === 'video';
  const isImage = item.mediaType === 'image';
  const isAudio = item.mediaType === 'audio';

  const handleItemOpen = () => {
    if ((isVideo || isAudio) && onOpenTrimmer) {
      onOpenTrimmer(item);
    } else if (onPreview) {
      onPreview(item);
    }
  };

  const formats = FORMAT_OPTIONS[item.mediaType] || FORMAT_OPTIONS.video;
  const presetList = PRESETS[item.mediaType] || PRESETS.video;

  const savings = item.outputSize && item.size
    ? Math.round(((item.size - item.outputSize) / item.size) * 100)
    : null;

  const mediaUrl = window.api && window.api.toMediaUrl ? window.api.toMediaUrl(item.filePath) : '';
  const [thumbSrc, setThumbSrc] = useState(mediaUrl);

  const isTrimmed = item.settings?.trimEnd > 0 || item.settings?.trimStart > 0;

  return (
    <div
      className={`group relative rounded-2xl p-4 transition-all duration-300 border ${
        item.status === 'processing'
          ? 'border-accent bg-slate-900/80 glow-accent'
          : item.status === 'completed'
          ? 'border-emerald-500/30 bg-emerald-950/15'
          : item.status === 'failed'
          ? 'border-rose-500/30 bg-rose-950/15'
          : 'border-white/5 hover:border-white/15 bg-slate-900/40 hover:bg-slate-900/60'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Thumbnail Preview & Metadata */}
        <div className="flex items-start md:items-center gap-3.5 min-w-0">
          {/* Interactive Preview / Trim Thumbnail */}
          <div
            onClick={handleItemOpen}
            className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-white/10 hover:border-accent bg-black/40 flex items-center justify-center cursor-pointer group/thumb shadow-md transition"
            title={(isVideo || isAudio) ? 'Нажмите для обрезки и просмотра' : 'Нажмите для просмотра'}
          >
            {isImage ? (
              <img
                src={thumbSrc}
                alt={item.fileName}
                onError={async () => {
                  if (window.api && window.api.readImageAsDataUrl) {
                    try {
                      const dUrl = await window.api.readImageAsDataUrl(item.filePath);
                      if (dUrl) setThumbSrc(dUrl);
                    } catch {}
                  }
                }}
                className="w-full h-full object-cover transition duration-300 group-hover/thumb:scale-110"
              />
            ) : isVideo ? (
              <div className="w-full h-full flex items-center justify-center bg-accent-subtle text-accent">
                <Film className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent-subtle text-accent">
                <Music className="w-6 h-6" />
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition duration-200">
              {(isVideo || isAudio) ? (
                <Scissors className="w-5 h-5 text-accent" />
              ) : (
                <Eye className="w-5 h-5 text-white" />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4
                onClick={handleItemOpen}
                className="font-semibold text-sm text-white truncate max-w-xs md:max-w-md hover:text-accent cursor-pointer transition"
                title={item.fileName}
              >
                {item.fileName}
              </h4>
              <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                {item.extension}
              </span>
            </div>

            {/* Sub-metadata */}
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
              <span className="text-slate-200 font-semibold">{formatBytes(item.size)}</span>

              {item.duration > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>{formatDuration(item.duration)}</span>
                </>
              )}

              {item.video?.width && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>{item.video.width}×{item.video.height}</span>
                  {item.video.fps && <span>@{item.video.fps}fps</span>}
                </>
              )}

              {item.audio?.bitrate > 0 && !item.video && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>{Math.round(item.audio.bitrate / 1000)}k</span>
                </>
              )}
            </div>

            {/* Active Trim range badge if trimmed */}
            {isTrimmed && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-accent-subtle text-accent border border-accent/40 shadow-sm">
                  <Scissors className="w-3 h-3 text-accent" />
                  <span>Обрезан: {formatDuration(item.settings?.trimStart || 0)} - {formatDuration(item.settings?.trimEnd || 0)}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {item.status === 'idle' && (
            <>
              {/* Trim Button for Video & Audio */}
              {(isVideo || isAudio) && onOpenTrimmer && (
                <button
                  type="button"
                  onClick={() => onOpenTrimmer(item)}
                  title="Обрезать аудио или видео (Таймлайн-триммер)"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isTrimmed
                      ? 'bg-accent-subtle text-accent border-accent glow-accent'
                      : isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5 text-accent" />
                  <span className="hidden sm:inline">Обрезать</span>
                </button>
              )}

              {/* Target Format */}
              <select
                value={item.targetFormat}
                onChange={(e) => onUpdateFormat(item.id, e.target.value)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-accent cursor-pointer transition ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-white/5 border-white/10 text-white'
                }`}
              >
                {formats.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Preset Selector */}
              <select
                value={item.preset}
                onChange={(e) => onUpdatePreset(item.id, e.target.value)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-accent cursor-pointer transition ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-white/5 border-white/10 text-slate-200'
                }`}
              >
                {presetList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Pro Inspector */}
              <button
                type="button"
                onClick={() => onOpenInspector(item)}
                title="Настроить параметры кодека и битрейта"
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200'
                    : 'bg-white/5 hover:bg-accent-subtle hover:text-accent border-white/10 hover:border-accent text-slate-300'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {/* Start Single Conversion Button (Using active dynamic theme!) */}
              <button
                type="button"
                onClick={() => onStartSingle(item.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold btn-accent cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Сжать</span>
              </button>
            </>
          )}

          {/* Processing state details */}
          {item.status === 'processing' && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-accent">
                  {item.progress}%
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {item.speed && <span>{item.speed} </span>}
                  {item.fps > 0 && <span>({item.fps} fps)</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCancel(item.id)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition border border-rose-500/30 cursor-pointer"
              >
                Отмена
              </button>
            </div>
          )}

          {/* Completed state details */}
          {item.status === 'completed' && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Готово</span>
                {savings !== null && (
                  <span className="font-bold text-emerald-300">
                    ({savings > 0 ? `-${savings}%` : 'Без потерь'})
                  </span>
                )}
                {item.outputSize > 0 && (
                  <span className="text-[11px] font-mono text-emerald-200/80">
                    ({formatBytes(item.outputSize)})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onReveal(item.outputPath)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition border border-white/10 cursor-pointer"
                title="Показать файл в проводнике"
              >
                <FolderOpen className="w-3.5 h-3.5 text-accent" />
                <span>Открыть</span>
              </button>
            </div>
          )}

          {/* Failed state */}
          {item.status === 'failed' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs" title={item.error}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Ошибка</span>
              </div>
              <button
                type="button"
                onClick={() => onStartSingle(item.id)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Повторить"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Remove from queue */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            title="Удалить из списка"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time progress bar */}
      {item.status === 'processing' && (
        <div className="mt-3 w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 glow-accent"
            style={{ width: `${Math.max(2, item.progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
