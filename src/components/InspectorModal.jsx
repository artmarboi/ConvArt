import React, { useState } from 'react';
import { X, Sliders, Check, Flame } from 'lucide-react';

export default function InspectorModal({ item, onClose, onSave, systemStatus }) {
  const [settings, setSettings] = useState({
    ...item.settings,
    crf: item.settings.crf ?? 23,
    videoCodec: item.settings.videoCodec || 'auto',
    hwAccel: item.settings.hwAccel || 'auto',
    resolution: item.settings.resolution || 'original',
    fps: item.settings.fps || 'original',
    removeAudio: item.settings.removeAudio || false,
    audioBitrate: item.settings.audioBitrate || '160k',
    imageQuality: item.settings.imageQuality ?? 82,
    imageWidth: item.settings.imageWidth || '',
    imageHeight: item.settings.imageHeight || '',
    stripMetadata: item.settings.stripMetadata !== false,
    targetSizeMB: item.settings.targetSizeMB || '',
  });

  const isVideo = item.mediaType === 'video';
  const isImage = item.mediaType === 'image';
  const isAudio = item.mediaType === 'audio';

  const handleApply = () => {
    onSave(item.id, settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0c101a] border border-white/10 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-subtle text-accent border border-accent glow-accent">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Настройка: {item.fileName}</h3>
              <p className="text-xs text-slate-400">Тонкий контроль кодека, битрейта и разрешения</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-2">
          {/* Target File Size */}
          {isVideo && (
            <div className="p-4 rounded-xl bg-accent-subtle border border-accent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-accent" /> Целевой лимит размера (МБ)
                </span>
                <span className="text-xs font-mono text-accent font-bold">
                  {settings.targetSizeMB ? `${settings.targetSizeMB} МБ` : 'Авто (по CRF)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Автоматически вычислит необходимый битрейт видео, чтобы файл гарантированно поместился в лимит.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, targetSizeMB: '' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    !settings.targetSizeMB ? 'bg-accent-subtle border-accent text-accent' : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  Авто (CRF)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, targetSizeMB: 8 })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    settings.targetSizeMB === 8 ? 'bg-accent-subtle border-accent text-accent' : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  8 МБ (Discord)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, targetSizeMB: 50 })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    settings.targetSizeMB === 50 ? 'bg-accent-subtle border-accent text-accent' : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  50 МБ (Telegram)
                </button>
                <input
                  type="number"
                  placeholder="Свой МБ"
                  value={settings.targetSizeMB}
                  onChange={(e) => setSettings({ ...settings, targetSizeMB: e.target.value ? parseFloat(e.target.value) : '' })}
                  className="w-24 px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* Video Options */}
          {isVideo && (
            <>
              {!settings.targetSizeMB && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-200">
                      Коэффициент сжатия (CRF): <span className="text-accent font-mono font-bold">{settings.crf}</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {settings.crf <= 19 ? '💎 Высочайшее качество' : settings.crf >= 28 ? '📦 Экстремальное сжатие' : '⚖️ Сбалансированно'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="35"
                    step="1"
                    value={settings.crf}
                    onChange={(e) => setSettings({ ...settings, crf: parseInt(e.target.value) })}
                    className="w-full accent-[var(--accent)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>16 (Lossless)</span>
                    <span>23 (Default)</span>
                    <span>28 (Tiny)</span>
                    <span>35 (Ultra-Shrink)</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Видеокодек</label>
                  <select
                    value={settings.videoCodec}
                    onChange={(e) => setSettings({ ...settings, videoCodec: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="auto" className="bg-slate-900">Авто (Рекомендуется)</option>
                    <option value="h264" className="bg-slate-900">H.264 / AVC (Макс. совместимость)</option>
                    <option value="hevc" className="bg-slate-900">H.265 / HEVC (На 40% меньше H.264)</option>
                    <option value="av1" className="bg-slate-900">AV1 (Новейший ультра-кодек)</option>
                    <option value="copy" className="bg-slate-900">Copy (Без перекодирования)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Аппаратное ускорение</label>
                  <select
                    value={settings.hwAccel}
                    onChange={(e) => setSettings({ ...settings, hwAccel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="auto" className="bg-slate-900">Авто-детекция GPU</option>
                    <option value="nvenc" className="bg-slate-900">NVIDIA NVENC</option>
                    <option value="cpu" className="bg-slate-900">Только CPU</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Разрешение видео</label>
                  <select
                    value={settings.resolution}
                    onChange={(e) => setSettings({ ...settings, resolution: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="original" className="bg-slate-900">Оригинальное ({item.video?.width}x{item.video?.height || '?'})</option>
                    <option value="3840:2160" className="bg-slate-900">4K Ultra HD (3840x2160)</option>
                    <option value="2560:1440" className="bg-slate-900">2K QHD (2560x1440)</option>
                    <option value="1920:1080" className="bg-slate-900">Full HD (1920x1080)</option>
                    <option value="1280:720" className="bg-slate-900">HD (1280x720)</option>
                    <option value="854:480" className="bg-slate-900">SD (854x480)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Частота кадров (FPS)</label>
                  <select
                    value={settings.fps}
                    onChange={(e) => setSettings({ ...settings, fps: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    <option value="original" className="bg-slate-900">Оригинал ({item.video?.fps || '60'} FPS)</option>
                    <option value="60" className="bg-slate-900">60 FPS</option>
                    <option value="30" className="bg-slate-900">30 FPS</option>
                    <option value="24" className="bg-slate-900">24 FPS</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Удалить звук (Mute)</div>
                  <div className="text-[11px] text-slate-400">Сделать видео беззвучным</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.removeAudio}
                  onChange={(e) => setSettings({ ...settings, removeAudio: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                />
              </div>
            </>
          )}

          {/* Image Options */}
          {isImage && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-200">
                    Качество изображения: <span className="text-accent font-mono font-bold">{settings.imageQuality}%</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {settings.imageQuality >= 90 ? '💎 Максимальное' : settings.imageQuality <= 65 ? '📦 Сильное сжатие' : '⚖️ Оптимально'}
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={settings.imageQuality}
                  onChange={(e) => setSettings({ ...settings, imageQuality: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ширина (px, опционально)</label>
                  <input
                    type="number"
                    placeholder="Например 1920"
                    value={settings.imageWidth}
                    onChange={(e) => setSettings({ ...settings, imageWidth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Высота (px, опционально)</label>
                  <input
                    type="number"
                    placeholder="Например 1080"
                    value={settings.imageHeight}
                    onChange={(e) => setSettings({ ...settings, imageHeight: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Очистить EXIF и метаданные</div>
                  <div className="text-[11px] text-slate-400">Удаляет данные геолокации и камеры</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.stripMetadata}
                  onChange={(e) => setSettings({ ...settings, stripMetadata: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                />
              </div>
            </>
          )}

          {/* Audio Options */}
          {isAudio && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Битрейт аудио</label>
              <select
                value={settings.audioBitrate}
                onChange={(e) => setSettings({ ...settings, audioBitrate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
              >
                <option value="320k" className="bg-slate-900">320 kbps (Studio Max)</option>
                <option value="256k" className="bg-slate-900">256 kbps (High Quality)</option>
                <option value="192k" className="bg-slate-900">192 kbps (Standard Stream)</option>
                <option value="128k" className="bg-slate-900">128 kbps (Balanced)</option>
                <option value="96k" className="bg-slate-900">96 kbps (Voice / Podcast)</option>
              </select>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold btn-accent cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>
  );
}
