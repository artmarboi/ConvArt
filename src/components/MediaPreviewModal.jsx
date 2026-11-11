import React, { useEffect, useState, useCallback } from 'react';
import { X, Film, Image as ImageIcon, Music, ExternalLink, HardDrive, AlertCircle, Play, Scissors, RefreshCw, Zap } from 'lucide-react';
import { formatBytes, formatDuration } from '../constants/presets';

export default function MediaPreviewModal({ item, onClose, onReveal, onOpenTrimmer, themeMode }) {
  const isLight = themeMode === 'light';
  const [videoError, setVideoError] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(null);
  const [isGeneratingProxy, setIsGeneratingProxy] = useState(false);
  const [extractedFrameUrl, setExtractedFrameUrl] = useState(null);
  const [scrubTime, setScrubTime] = useState(0);
  const [duration, setDuration] = useState(item?.duration || 0);
  const latestReqTimeRef = useRef(0);

  useEffect(() => {
    if (!duration || duration <= 0) {
      if (window.api && window.api.probeFile && item?.filePath) {
        window.api.probeFile(item.filePath).then((meta) => {
          if (meta && meta.duration > 0) {
            setDuration(meta.duration);
          }
        }).catch(() => {});
      }
    }
  }, [item?.filePath, duration]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const baseMediaUrl = window.api && window.api.toMediaUrl ? window.api.toMediaUrl(item.filePath) : '';
  const mediaUrl = proxyUrl || baseMediaUrl;
  const [imgSrc, setImgSrc] = useState(baseMediaUrl);

  const isVideo = item.mediaType === 'video';
  const isImage = item.mediaType === 'image';
  const isAudio = item.mediaType === 'audio';

  const fetchFrame = useCallback(async (timeSec) => {
    if (!window.api || !window.api.extractFrame) return;
    latestReqTimeRef.current = timeSec;
    try {
      const dataUrl = await window.api.extractFrame({
        filePath: item.filePath,
        time: timeSec,
        width: 800,
      });
      if (dataUrl && latestReqTimeRef.current === timeSec) {
        setExtractedFrameUrl(dataUrl);
      }
    } catch {}
  }, [item.filePath]);

  useEffect(() => {
    if (videoError && !proxyUrl) {
      fetchFrame(scrubTime);
    }
  }, [videoError, scrubTime, proxyUrl, fetchFrame]);

  const handleGenerateProxy = async () => {
    if (!window.api || !window.api.generateFastPreview) return;
    setIsGeneratingProxy(true);
    try {
      const res = await window.api.generateFastPreview(item.filePath);
      if (res && res.proxyPath) {
        setProxyUrl(window.api.toMediaUrl(res.proxyPath));
        setVideoError(false);
      }
    } catch (err) {
      console.error('Proxy failed:', err);
    } finally {
      setIsGeneratingProxy(false);
    }
  };

  useEffect(() => {
    setImgSrc(baseMediaUrl);
    if (isImage && window.api && window.api.readImageAsDataUrl) {
      window.api.readImageAsDataUrl(item.filePath)
        .then((dataUrl) => {
          if (dataUrl) setImgSrc(dataUrl);
        })
        .catch(() => {});
    }
  }, [item.filePath, baseMediaUrl, isImage]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0b0e17] border-white/15'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]" />

        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent-subtle text-accent border border-accent shrink-0 glow-accent">
              {isVideo ? <Film className="w-4 h-4" /> : isImage ? <ImageIcon className="w-4 h-4" /> : <Music className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className={`font-bold text-sm truncate max-w-lg ${isLight ? 'text-slate-900' : 'text-white'}`} title={item.fileName}>
                {item.fileName}
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span className={isLight ? 'text-slate-700 font-semibold' : 'text-slate-200 font-semibold'}>{formatBytes(item.size)}</span>
                {item.duration > 0 && <span>• {formatDuration(item.duration)}</span>}
                {item.video?.width && <span>• {item.video.width}×{item.video.height}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Trim Button inside Preview */}
            {(isVideo || isAudio) && onOpenTrimmer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTrimmer(item);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-accent cursor-pointer shadow-sm"
                title="Обрезать этот файл"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Обрезать</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onReveal(item.filePath)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
              }`}
              title="Открыть файл во внешнем плеере Windows или папке"
            >
              <HardDrive className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Файл на диске</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Content Viewport */}
        <div className={`flex-1 flex items-center justify-center p-4 overflow-hidden min-h-[350px] ${
          isLight ? 'bg-slate-100/70' : 'bg-black/80'
        }`}>
          {isImage && (
            <img
              src={imgSrc}
              alt={item.fileName}
              onError={async () => {
                if (window.api && window.api.readImageAsDataUrl) {
                  try {
                    const dataUrl = await window.api.readImageAsDataUrl(item.filePath);
                    if (dataUrl) setImgSrc(dataUrl);
                  } catch {}
                }
              }}
              className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl border border-black/10"
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
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {extractedFrameUrl ? (
                    <img
                      src={extractedFrameUrl}
                      alt="FFmpeg Frame Preview"
                      className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-2xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                      <AlertCircle className="w-10 h-10 text-rose-400" />
                      <p className="text-sm text-slate-200 font-semibold">
                        Кодек контейнера не поддерживается встроенным Chromium плеером
                      </p>
                    </div>
                  )}

                  {/* Scrubber & Options Bar */}
                  <div className="absolute bottom-2 left-2 right-2 p-3 rounded-2xl bg-black/90 backdrop-blur-md border border-white/15 flex flex-col gap-2 shadow-2xl">
                    {/* Time scrubber slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-accent font-bold">
                        {formatDuration(scrubTime)}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        step="0.5"
                        value={scrubTime}
                        onChange={(e) => setScrubTime(parseFloat(e.target.value) || 0)}
                        className="flex-1 accent-[var(--accent)] cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-slate-400">
                        {formatDuration(duration || 0)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                        <span>FFmpeg Покадровый просмотр</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateProxy}
                          disabled={isGeneratingProxy}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold btn-accent cursor-pointer disabled:opacity-50"
                          title="Сгенерировать легкий H.264 Web-просмотр"
                        >
                          {isGeneratingProxy ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Генерация...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>⚡ Создать Web-просмотр</span>
                            </>
                          )}
                        </button>

                        {onOpenTrimmer && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenTrimmer(item);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer"
                          >
                            <Scissors className="w-3.5 h-3.5 text-accent" />
                            <span>Обрезать</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onReveal(item.filePath)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-accent" />
                          <span>Плеер Windows</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isAudio && (
            <div className={`w-full max-w-lg p-8 rounded-2xl border flex flex-col items-center text-center gap-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200 shadow-slate-300/40' : 'bg-white/5 border-white/10'
            }`}>
              <div className="w-24 h-24 rounded-3xl bg-accent-subtle border border-accent flex items-center justify-center glow-accent-lg">
                <Music className="w-12 h-12 text-accent animate-pulse" />
              </div>
              <div>
                <h4 className={`font-bold text-base truncate max-w-md ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.fileName}</h4>
                <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
