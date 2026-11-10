import React, { useState, useEffect } from 'react';
import {
  Download, Globe, Film, Music, CheckCircle2,
  AlertCircle, RefreshCw, FolderOpen, ArrowRight, Trash, Plus,
  X
} from 'lucide-react';
import { formatDuration } from '../constants/presets';

export default function WebDownloader({
  outputDir,
  onSendToQueue,
}) {
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Download items queue
  const [items, setItems] = useState([]);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Subscribe to real-time IPC download progress
  useEffect(() => {
    if (!window.api || !window.api.onDownloadProgress) return;

    const unsubscribe = window.api.onDownloadProgress((data) => {
      const { downloadId, status, percent, speed, eta, totalSize, filePath, error } = data;

      setItems((prev) =>
        prev.map((item) => {
          if (item.downloadId !== downloadId) return item;
          return {
            ...item,
            status: status || item.status,
            percent: percent !== undefined ? percent : item.percent,
            speed: speed || item.speed,
            eta: eta || item.eta,
            totalSize: totalSize || item.totalSize,
            filePath: filePath || item.filePath,
            error: error || item.error,
          };
        })
      );
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch info & add item to queue
  const handleAddUrl = async (e) => {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    setIsFetchingInfo(true);
    setFetchError(null);

    try {
      if (!window.api || !window.api.getWebMediaInfo) {
        throw new Error('API загрузчика недоступно в Electron');
      }

      const info = await window.api.getWebMediaInfo(cleanUrl);

      const isAudioOnly = !info.hasVideo;
      const initialMode = isAudioOnly ? 'audio' : 'video';
      const initialQuality = isAudioOnly
        ? (info.audioQualities?.[0] || null)
        : (info.videoQualities?.[0] || info.audioQualities?.[0] || null);

      const newItem = {
        id: 'web_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        downloadId: 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        url: cleanUrl,
        title: info.title || 'Медиафайл',
        uploader: info.uploader || 'Неизвестно',
        thumbnail: info.thumbnail || null,
        duration: info.duration || 0,
        extractor: info.extractor || 'Web',
        hasVideo: info.hasVideo,
        videoQualities: info.videoQualities || [],
        audioQualities: info.audioQualities || [],
        mode: initialMode,
        selectedQuality: initialQuality,
        status: 'idle', // 'idle' | 'downloading' | 'completed' | 'failed'
        percent: 0,
        speed: '',
        eta: '',
        totalSize: '',
        filePath: null,
        error: null,
      };

      setItems((prev) => [newItem, ...prev]);
      setUrlInput('');
    } catch (err) {
      setFetchError(err.message || 'Ошибка загрузки информации по ссылке');
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setUrlInput(text.trim());
      }
    } catch {}
  };

  const handleUpdateMode = (id, newMode) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQuality = newMode === 'video' ? item.videoQualities[0] : item.audioQualities[0];
        return { ...item, mode: newMode, selectedQuality: newQuality };
      })
    );
  };

  const handleUpdateQuality = (id, quality) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selectedQuality: quality } : item))
    );
  };

  // Start single item download
  const handleStartDownload = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.selectedQuality) return;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'downloading', percent: 0, error: null } : i))
    );

    try {
      await window.api.startWebDownload({
        url: item.url,
        quality: item.selectedQuality,
        outputFolder: outputDir,
        downloadId: item.downloadId,
      });
    } catch (err) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'failed', error: err.message } : i))
      );
    }
  };

  const handleCancelDownload = (id) => {
    const item = items.find((i) => i.id === id);
    if (item && item.downloadId && window.api && window.api.cancelWebDownload) {
      window.api.cancelWebDownload(item.downloadId);
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'idle', percent: 0 } : i))
    );
  };

  const handleRemove = (id) => {
    handleCancelDownload(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCompleted = () => {
    setItems((prev) => prev.filter((i) => i.status !== 'completed'));
  };

  const handleClearAll = () => {
    items.forEach((i) => handleCancelDownload(i.id));
    setItems([]);
  };

  // Sequential batch download of all idle items
  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    const pending = items.filter((i) => i.status === 'idle');

    for (const item of pending) {
      await new Promise((resolve) => {
        handleStartDownload(item.id);
        const interval = setInterval(() => {
          setItems((current) => {
            const cur = current.find((c) => c.id === item.id);
            if (cur && (cur.status === 'completed' || cur.status === 'failed')) {
              clearInterval(interval);
              resolve();
            }
            return current;
          });
        }, 400);
      });
    }

    setIsDownloadingAll(false);
  };

  const hasItems = items.length > 0;

  return (
    <div className={`w-full flex-1 flex flex-col ${
      !hasItems ? 'min-h-[calc(100vh-6rem)] items-center justify-center' : 'gap-5'
    } animate-in fade-in duration-300`}>
      {/* Hero Input Box (Exact same dimensions, radius, padding, style as Converter DropZone) */}
      <div className="relative w-full max-w-[680px] min-h-[390px] h-[390px] mx-auto rounded-3xl p-8 sm:p-9 bg-slate-900/50 backdrop-blur-2xl border border-white/10 glow-accent text-center flex flex-col items-center justify-between overflow-hidden transition-all duration-300 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent-glow)_0%,_transparent_65%)] opacity-15 pointer-events-none" />

        {/* Top: Central icon cluster */}
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-subtle border border-accent flex items-center justify-center glow-accent shadow-xl">
            <Globe className="w-7 h-7 text-accent" />
          </div>
        </div>

        {/* Middle: Heading & Description */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
            Загрузчик медиа из любых источников
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
            Вставьте ссылку на <strong>YouTube, SoundCloud, TikTok, VK, Spotify</strong> — видео в 4K/1080p или аудио с метаданными и обложкой.
          </p>
        </div>

        {/* Bottom: URL Input Form & Platform tags */}
        <div className="w-full flex flex-col items-center gap-4">
          <form onSubmit={handleAddUrl} className="w-full flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Вставьте ссылку на видео или трек (например: https://soundcloud.com/...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isFetchingInfo}
                className="w-full pl-4 pr-24 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent glow-accent transition"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-mono bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              >
                Вставить
              </button>
            </div>

            <button
              type="submit"
              disabled={isFetchingInfo || !urlInput.trim()}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isFetchingInfo || !urlInput.trim()
                  ? 'opacity-50 cursor-not-allowed bg-white/10 text-slate-400'
                  : 'btn-accent transform hover:-translate-y-0.5'
              }`}
            >
              {isFetchingInfo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Анализ...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>В очередь</span>
                </>
              )}
            </button>
          </form>

          {fetchError && (
            <div className="w-full p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1">{fetchError}</span>
              <button
                type="button"
                onClick={() => setFetchError(null)}
                className="text-rose-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">YouTube 4K</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">SoundCloud</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">TikTok</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">VK Видео</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">Spotify</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">MP3 320k</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">FLAC</span>
            <span className="text-slate-600">+ ещё 100+ сайтов</span>
          </div>
        </div>
      </div>

      {/* Queue Toolbar (Matching Converter style) */}
      {hasItems && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm tracking-wide text-white uppercase flex items-center gap-2">
              <span>Очередь загрузки ({items.length})</span>
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={isDownloadingAll || !items.some((i) => i.status === 'idle')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                isDownloadingAll || !items.some((i) => i.status === 'idle')
                  ? 'opacity-50 cursor-not-allowed bg-white/10 text-slate-400'
                  : 'btn-accent'
              }`}
            >
              {isDownloadingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Скачивание...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Скачать все ({items.filter((i) => i.status === 'idle').length})</span>
                </>
              )}
            </button>

            {items.some((i) => i.status === 'completed') && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
              >
                Очистить готовые
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
              title="Очистить очередь"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Queue Cards (Matching QueueItem.jsx horizontal compact style) */}
      {hasItems && (
        <div className="w-full flex flex-col gap-3 pb-32">
          {items.map((item) => {
            const isAudioOnly = !item.hasVideo || item.extractor.toLowerCase().includes('soundcloud') || item.url.includes('soundcloud.com');

            return (
              <div
                key={item.id}
                className={`group relative rounded-2xl p-4 transition-all duration-300 border ${
                  item.status === 'downloading'
                    ? 'border-accent bg-slate-900/80 glow-accent'
                    : item.status === 'completed'
                    ? 'border-emerald-500/30 bg-emerald-950/15'
                    : item.status === 'failed'
                    ? 'border-rose-500/30 bg-rose-950/15'
                    : 'border-white/5 hover:border-white/15 bg-slate-900/40 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Thumbnail Preview + Large Source Badge Underneath */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex flex-col items-center shrink-0 w-28 sm:w-32">
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-md">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-accent-subtle text-accent">
                            <Music className="w-6 h-6" />
                          </div>
                        )}
                        {item.duration > 0 && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-sm text-[9px] font-mono text-white font-semibold">
                            {formatDuration(item.duration)}
                          </span>
                        )}
                      </div>

                      {/* Prominent source badge placed directly under preview */}
                      <span className="mt-1.5 px-2.5 py-0.5 rounded-md bg-accent-subtle border border-accent text-accent text-[11px] font-black font-mono tracking-wider uppercase glow-accent shadow-sm text-center w-full truncate">
                        {item.extractor || 'WEB'}
                      </span>
                    </div>

                    {/* Title & Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className="font-semibold text-sm text-white truncate max-w-xs md:max-w-md hover:text-accent transition"
                          title={item.title}
                        >
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                        <span>Автор: <strong className="text-slate-200">{item.uploader}</strong></span>
                        {item.duration > 0 && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>{formatDuration(item.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Controls (Dropdowns matching Converter) */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {item.status === 'idle' && (
                      <>
                        {/* Mode Select (Video vs Audio) */}
                        {!isAudioOnly ? (
                          <select
                            value={item.mode}
                            onChange={(e) => handleUpdateMode(item.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-accent cursor-pointer hover:bg-white/10 transition"
                          >
                            <option value="video" className="bg-slate-900 text-white">Видео (MP4)</option>
                            <option value="audio" className="bg-slate-900 text-white">Аудио (MP3 / FLAC)</option>
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-accent-subtle border border-accent text-accent text-xs font-semibold">
                            Аудио
                          </span>
                        )}

                        {/* Quality Select Dropdown (Changed from pill buttons to dropdown!) */}
                        <select
                          value={item.selectedQuality?.id || ''}
                          onChange={(e) => {
                            const list = item.mode === 'video' ? item.videoQualities : item.audioQualities;
                            const found = list.find((q) => q.id === e.target.value);
                            if (found) handleUpdateQuality(item.id, found);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-accent cursor-pointer hover:bg-white/10 transition max-w-[200px] truncate"
                        >
                          {(item.mode === 'video' ? item.videoQualities : item.audioQualities)?.map((q) => (
                            <option key={q.id} value={q.id} className="bg-slate-900 text-white">
                              {q.label}
                            </option>
                          ))}
                        </select>

                        {/* Single Download Button */}
                        <button
                          type="button"
                          onClick={() => handleStartDownload(item.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold btn-accent cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Скачать</span>
                        </button>
                      </>
                    )}

                    {/* Downloading state */}
                    {item.status === 'downloading' && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-accent">
                            {item.percent}%
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {item.speed && <span>{item.speed} </span>}
                            {item.eta && <span>({item.eta})</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelDownload(item.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition border border-rose-500/30 cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    )}

                    {/* Completed state */}
                    {item.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Готово</span>
                        </div>

                        {item.filePath && (
                          <>
                            <button
                              type="button"
                              onClick={() => window.api.revealFile(item.filePath)}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                              title="Показать в проводнике"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-accent" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSendToQueue(item.filePath)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold btn-accent cursor-pointer"
                              title="Отправить в ConvArt для сжатия"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>В конвертер</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Failed state */}
                    {item.status === 'failed' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400 truncate max-w-xs">{item.error}</span>
                        <button
                          type="button"
                          onClick={() => handleStartDownload(item.id)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                        >
                          Повторить
                        </button>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      title="Удалить"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Downloading Progress Bar Bar */}
                {item.status === 'downloading' && (
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 glow-accent"
                      style={{ width: `${Math.max(3, item.percent)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
