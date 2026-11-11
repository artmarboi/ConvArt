import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Scissors, Play, Pause, RotateCcw, Clock, Zap, CheckCircle2,
  FolderOpen, AlertCircle, RefreshCw, HardDrive
} from 'lucide-react';
import { formatDuration, formatBytes } from '../constants/presets';

function formatPreciseTime(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default function TrimmerModal({
  item,
  onClose,
  onSaveTrim,
  onReveal,
  themeMode,
  outputDir,
}) {
  const isLight = themeMode === 'light';
  const isVideo = item.mediaType === 'video';
  const isAudio = item.mediaType === 'audio';

  const mediaRef = useRef(null);
  const timelineRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.duration || 0);

  // Trim range
  const initialStart = item.settings?.trimStart || 0;
  const initialEnd = item.settings?.trimEnd && item.settings.trimEnd > 0 ? item.settings.trimEnd : (item.duration || 0);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);

  // Fallback for unsupported codecs (FFmpeg Frame Scrubber & Fast Proxy)
  const [videoError, setVideoError] = useState(false);
  const [extractedFrameUrl, setExtractedFrameUrl] = useState(null);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [isGeneratingProxy, setIsGeneratingProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(null);

  // Dragging and scrubbing refs
  const isScrubbingRef = useRef(false);
  const latestFrameTimeRef = useRef(0);

  // Lossless Cut execution state
  const [isCutting, setIsCutting] = useState(false);
  const [cutResult, setCutResult] = useState(null);
  const [cutError, setCutError] = useState(null);

  const mediaUrl = proxyUrl || (window.api && window.api.toMediaUrl ? window.api.toMediaUrl(item.filePath) : '');

  // Probe file duration if missing or 0
  useEffect(() => {
    if (!duration || duration <= 0) {
      if (window.api && window.api.probeFile) {
        window.api.probeFile(item.filePath).then((meta) => {
          if (meta && meta.duration > 0) {
            setDuration(meta.duration);
            if (endTime === 0 || endTime > meta.duration) {
              setEndTime(meta.duration);
            }
          }
        }).catch(() => {});
      }
    }
  }, [item.filePath, duration, endTime]);

  // Extract frame using FFmpeg if video cannot be decoded by Chromium
  const fetchFrameAtTime = useCallback(async (timeSec) => {
    if (!window.api || !window.api.extractFrame) return;
    latestFrameTimeRef.current = timeSec;
    setIsExtractingFrame(true);
    try {
      const dataUrl = await window.api.extractFrame({
        filePath: item.filePath,
        time: timeSec,
        width: 800,
      });
      if (dataUrl && latestFrameTimeRef.current === timeSec) {
        setExtractedFrameUrl(dataUrl);
      }
    } catch {}
    setIsExtractingFrame(false);
  }, [item.filePath]);

  // When video fails or time changes in error mode, load frame
  useEffect(() => {
    if (videoError && !proxyUrl) {
      fetchFrameAtTime(currentTime);
    }
  }, [videoError, currentTime, proxyUrl, fetchFrameAtTime]);

  // Generate fast H.264 proxy
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
      console.error('Proxy error:', err);
    } finally {
      setIsGeneratingProxy(false);
    }
  };

  // Sync duration once metadata is loaded
  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      const d = mediaRef.current.duration;
      if (d && !isNaN(d) && d > 0) {
        setDuration(d);
        if (endTime === 0 || endTime > d) {
          setEndTime(d);
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current && !isScrubbingRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
      if (endTime > 0 && mediaRef.current.currentTime >= endTime) {
        mediaRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (videoError && !proxyUrl) {
      // In frame-scrubber mode: step through frames
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
      }
      return;
    }

    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      if (mediaRef.current.currentTime < startTime || mediaRef.current.currentTime >= endTime) {
        mediaRef.current.currentTime = startTime;
      }
      mediaRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (t, updateMedia = true) => {
    const safeDuration = duration > 0 ? duration : 100;
    const target = Math.max(0, Math.min(t, safeDuration));
    setCurrentTime(target);
    if (updateMedia && mediaRef.current && !videoError) {
      try {
        mediaRef.current.currentTime = target;
      } catch (e) {}
    }
    if (videoError && !proxyUrl) {
      fetchFrameAtTime(target);
    }
  };

  const setStartToCurrent = () => {
    const cur = currentTime;
    if (cur < endTime) {
      setStartTime(cur);
    } else {
      setStartTime(Math.max(0, endTime - 1));
    }
  };

  const setEndToCurrent = () => {
    const cur = currentTime;
    if (cur > startTime) {
      setEndTime(cur);
    } else {
      setEndTime(Math.min(duration, startTime + 1));
    }
  };

  const resetTrim = () => {
    setStartTime(0);
    setEndTime(duration);
    seekTo(0);
  };

  // ── Dragging Timeline / Playhead Scrubber ───────────────────────────
  const handleTimelineScrub = (e) => {
    e.preventDefault();
    const bar = timelineRef.current;
    if (!bar) return;
    isScrubbingRef.current = true;
    const safeDuration = duration > 0 ? duration : 100;

    const calcTime = (clientX) => {
      const rect = bar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pos * safeDuration;
    };

    const initialTime = calcTime(e.clientX);
    seekTo(initialTime, true);

    const onMouseMove = (moveEvent) => {
      const t = calcTime(moveEvent.clientX);
      seekTo(t, false);
    };

    const onMouseUp = (upEvent) => {
      isScrubbingRef.current = false;
      const finalTime = calcTime(upEvent.clientX);
      seekTo(finalTime, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── Dragging Trimmer Handles with Hover Expansion ──────────────────
  const handleStartDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const bar = timelineRef.current;
    if (!bar) return;
    const safeDuration = duration > 0 ? duration : 100;

    const onMouseMove = (moveEvent) => {
      const rect = bar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const newTime = pos * safeDuration;
      if (newTime < endTime) {
        setStartTime(newTime);
        seekTo(newTime, false);
      }
    };

    const onMouseUp = (upEvent) => {
      const rect = bar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (upEvent.clientX - rect.left) / rect.width));
      const finalTime = Math.min(pos * safeDuration, endTime - 0.1);
      setStartTime(finalTime);
      seekTo(finalTime, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleEndDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const bar = timelineRef.current;
    if (!bar) return;
    const safeDuration = duration > 0 ? duration : 100;

    const onMouseMove = (moveEvent) => {
      const rect = bar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const newTime = pos * safeDuration;
      if (newTime > startTime) {
        setEndTime(newTime);
        seekTo(newTime, false);
      }
    };

    const onMouseUp = (upEvent) => {
      const rect = bar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (upEvent.clientX - rect.left) / rect.width));
      const finalTime = Math.max(pos * safeDuration, startTime + 0.1);
      setEndTime(finalTime);
      seekTo(finalTime, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, startTime, endTime, duration]);

  // Apply trim to converter item settings
  const handleApplyToQueue = () => {
    if (onSaveTrim) {
      onSaveTrim({
        id: item.id,
        trimStart: startTime,
        trimEnd: endTime,
      });
    }
    onClose();
  };

  // Fast Lossless Cut
  const handleLosslessCut = async () => {
    if (!window.api || !window.api.losslessCut) return;
    setIsCutting(true);
    setCutError(null);
    setCutResult(null);

    try {
      const res = await window.api.losslessCut({
        inputPath: item.filePath,
        outputFolder: outputDir || undefined,
        startTime,
        endTime,
      });
      setCutResult(res);
    } catch (err) {
      setCutError(err.message || 'Ошибка обрезки файла');
    } finally {
      setIsCutting(false);
    }
  };

  const trimmedDuration = Math.max(0, endTime - startTime);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0b0e17] border-white/15'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]" />

        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-accent-subtle text-accent border border-accent shrink-0 glow-accent">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-base truncate max-w-md ${isLight ? 'text-slate-900' : 'text-white'}`} title={item.fileName}>
                  {item.fileName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-accent-subtle text-accent border border-accent/30">
                  Таймлайн-триммер
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                <span>Длина: {formatDuration(duration)}</span>
                <span>•</span>
                <span>{formatBytes(item.size)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-2xl transition cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Viewport */}
        <div className={`relative flex-1 flex flex-col items-center justify-center p-4 min-h-[300px] max-h-[50vh] overflow-hidden ${
          isLight ? 'bg-slate-900' : 'bg-black'
        }`}>
          {isVideo && (
            <>
              {!videoError ? (
                <video
                  ref={mediaRef}
                  src={mediaUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onClick={togglePlay}
                  onError={() => setVideoError(true)}
                  playsInline
                  className="w-full h-full max-h-[46vh] object-contain rounded-xl cursor-pointer"
                />
              ) : (
                /* FFmpeg Frame Scrubber View when codec is unsupported by Chromium */
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {extractedFrameUrl ? (
                    <img
                      src={extractedFrameUrl}
                      alt="FFmpeg Frame Preview"
                      className="max-h-[44vh] max-w-full object-contain rounded-xl shadow-2xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                      <AlertCircle className="w-10 h-10 text-rose-400" />
                      <p className="text-sm text-slate-200 font-semibold">
                        Кодек видео не декодируется встроенным Chromium плеером
                      </p>
                    </div>
                  )}

                  {/* Overlay Controls Bar for Unsupported Codec Options */}
                  <div className="absolute bottom-2 left-2 right-2 p-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-2 shadow-2xl">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                      <span>FFmpeg Покадровый просмотр активен</span>
                    </div>

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
                            <span>Генерация превью...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>⚡ Создать Web-просмотр (H.264)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onReveal && onReveal(item.filePath)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-accent" />
                        <span>Плеер Windows</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {isAudio && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-20 h-20 rounded-3xl bg-accent-subtle border border-accent flex items-center justify-center glow-accent-lg">
                <Scissors className="w-10 h-10 text-accent animate-pulse" />
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-base">{item.fileName}</div>
                <div className="text-xs text-slate-400 font-mono mt-1">Аудио трек • {formatDuration(duration)}</div>
              </div>
              <audio
                ref={mediaRef}
                src={mediaUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
          )}

          {/* Central Play/Pause button (for playable media) */}
          {!videoError && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute z-10 w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-200 hover:scale-110 cursor-pointer glow-accent"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>
          )}
        </div>

        {/* Timeline & Interactive Controls Bar */}
        <div className={`p-6 border-t flex flex-col gap-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0f1422] border-white/10 text-slate-200'
        }`}>
          {/* Timeline Range Scrubber */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-accent">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatPreciseTime(currentTime)}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Длина фрагмента: <strong className="text-accent">{formatPreciseTime(trimmedDuration)}</strong> из {formatDuration(duration)}
              </span>
              <span className="text-slate-400">{formatPreciseTime(duration)}</span>
            </div>

            {/* Visual Timeline Bar with Draggable Playhead & Expanding Range Handles */}
            <div
              ref={timelineRef}
              onMouseDown={handleTimelineScrub}
              className="relative w-full h-10 rounded-2xl bg-slate-800/80 border border-white/10 overflow-visible cursor-pointer select-none"
            >
              {/* Highlighted Trimmed Range Track */}
              <div
                className="absolute top-0 bottom-0 bg-accent/25 border-t border-b border-accent/40 rounded-lg pointer-events-none transition-all duration-75"
                style={{
                  left: `${duration > 0 ? (startTime / duration) * 100 : 0}%`,
                  width: `${duration > 0 ? (trimmedDuration / duration) * 100 : 100}%`,
                }}
              />

              {/* ── DRAGGABLE PLAYHEAD WITH ACCENT HEAD ── */}
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none transition-[left] duration-75"
                style={{
                  left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              >
                {/* Vertical playhead line */}
                <div className="absolute top-0 bottom-0 -ml-[1.5px] w-[3px] bg-white shadow-[0_0_10px_white]" />

                {/* Scrubber Knob Head */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleTimelineScrub(e);
                  }}
                  className="pointer-events-auto absolute -top-3.5 -ml-2.5 w-5 h-5 rounded-full bg-white border-2 border-accent shadow-2xl cursor-grab active:cursor-grabbing hover:scale-125 transition-transform flex items-center justify-center glow-accent"
                  title={`Перетащите для перемотки (${formatPreciseTime(currentTime)})`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>
              </div>

              {/* ── LEFT TRIM HANDLE (Expands on hover to grab easily) ── */}
              <div
                onMouseDown={handleStartDrag}
                className="group/starthandle absolute top-0 bottom-0 -ml-3 w-6 flex items-center justify-center cursor-ew-resize z-30 select-none"
                style={{ left: `${duration > 0 ? (startTime / duration) * 100 : 0}%` }}
                title="Потяните для изменения начала фрагмента"
              >
                {/* Visual Handle Knob that expands on hover */}
                <div className="w-3 h-12 rounded-lg bg-accent border-2 border-white shadow-xl glow-accent transition-all duration-200 group-hover/starthandle:w-5 group-hover/starthandle:h-14 group-hover/starthandle:scale-110 flex items-center justify-center">
                  <div className="w-0.5 h-4 bg-slate-950/80 rounded-full" />
                </div>
                {/* Floating Time Tooltip */}
                <div className="absolute -top-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-accent text-slate-950 opacity-0 group-hover/starthandle:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                  Старт: {formatPreciseTime(startTime)}
                </div>
              </div>

              {/* ── RIGHT TRIM HANDLE (Expands on hover to grab easily) ── */}
              <div
                onMouseDown={handleEndDrag}
                className="group/endhandle absolute top-0 bottom-0 -ml-3 w-6 flex items-center justify-center cursor-ew-resize z-30 select-none"
                style={{ left: `${duration > 0 ? (endTime / duration) * 100 : 100}%` }}
                title="Потяните для изменения конца фрагмента"
              >
                {/* Visual Handle Knob that expands on hover */}
                <div className="w-3 h-12 rounded-lg bg-accent border-2 border-white shadow-xl glow-accent transition-all duration-200 group-hover/endhandle:w-5 group-hover/endhandle:h-14 group-hover/endhandle:scale-110 flex items-center justify-center">
                  <div className="w-0.5 h-4 bg-slate-950/80 rounded-full" />
                </div>
                {/* Floating Time Tooltip */}
                <div className="absolute -top-7 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-accent text-slate-950 opacity-0 group-hover/endhandle:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                  Конец: {formatPreciseTime(endTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Mark Buttons & Precise Time Inputs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={setStartToCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-accent-subtle text-accent border border-accent hover:brightness-110 transition cursor-pointer"
                title="Установить начало фрагмента на текущее время"
              >
                <span>[ Старт с {formatPreciseTime(currentTime)} ]</span>
              </button>

              <button
                type="button"
                onClick={setEndToCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-accent-subtle text-accent border border-accent hover:brightness-110 transition cursor-pointer"
                title="Установить конец фрагмента на текущее время"
              >
                <span>[ Конец по {formatPreciseTime(currentTime)} ]</span>
              </button>

              <button
                type="button"
                onClick={resetTrim}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title="Сбросить на всю длину"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сброс</span>
              </button>
            </div>

            {/* Manual Second Inputs */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">От:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={endTime}
                  value={Math.round(startTime * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setStartTime(Math.max(0, Math.min(val, endTime)));
                    seekTo(val);
                  }}
                  className={`w-18 px-2 py-1 rounded-lg border text-center font-bold text-xs ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/60 border-white/15 text-white'
                  }`}
                />
                <span className="text-slate-400">сек</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-400">До:</span>
                <input
                  type="number"
                  step="0.5"
                  min={startTime}
                  max={duration}
                  value={Math.round(endTime * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || duration;
                    setEndTime(Math.max(startTime, Math.min(val, duration)));
                    seekTo(val);
                  }}
                  className={`w-18 px-2 py-1 rounded-lg border text-center font-bold text-xs ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-black/60 border-white/15 text-white'
                  }`}
                />
                <span className="text-slate-400">сек</span>
              </div>
            </div>
          </div>

          {/* Success or Error alert from lossless cut */}
          {cutResult && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Готово! Фрагмент обрезан без потерь: <strong>{cutResult.fileName}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => onReveal && onReveal(cutResult.outputPath)}
                className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold transition cursor-pointer"
              >
                Показать в папке
              </button>
            </div>
          )}

          {cutError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cutError}</span>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLosslessCut}
              disabled={isCutting || trimmedDuration <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Обрезать прямо сейчас за 1 секунду без перекодирования (Lossless Cut)"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isCutting ? 'Обрезка...' : '⚡ Обрезать без потерь'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold border transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handleApplyToQueue}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider btn-accent cursor-pointer shadow-lg hover:scale-105 transition-all"
              >
                <Scissors className="w-4 h-4 stroke-[2.5]" />
                <span>Применить для сжатия</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
