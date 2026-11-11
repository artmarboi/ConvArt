import React, { useState, useEffect } from 'react';
import {
  X, Settings, Folder, HardDrive, Check, Film, Music,
  Image as ImageIcon, Zap, Sparkles, RefreshCw, DownloadCloud,
  ArrowUpCircle, CheckCircle2, AlertCircle, Palette, Sun, Moon,
  Sliders, Trash2, Eye
} from 'lucide-react';
import { THEMES } from '../constants/presets';

export default function SettingsModal({
  settings,
  onSave,
  onClose,
  systemStatus,
  theme,
  setTheme,
  themeMode,
  setThemeMode,
  bgImage,
  setBgImage,
  bgDarkness,
  setBgDarkness,
  bgBlur,
  setBgBlur,
}) {
  const [activeTab, setActiveTab] = useState('customization'); // 'customization' | 'paths' | 'updates'
  const isLight = themeMode === 'light';

  const [localSettings, setLocalSettings] = useState({
    defaultDir: settings.defaultDir || '',
    videoDir: settings.videoDir || '',
    audioDir: settings.audioDir || '',
    imageDir: settings.imageDir || '',
    separateByType: settings.separateByType ?? true,
    saveSameFolder: settings.saveSameFolder ?? false,
    preferredHw: settings.preferredHw || 'auto',
  });

  const [appVersion, setAppVersion] = useState('1.0.2');
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateSpeed, setUpdateSpeed] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [resolutionWarning, setResolutionWarning] = useState(null);

  useEffect(() => {
    if (window.api && window.api.getAppVersion) {
      window.api.getAppVersion().then((v) => { if (v) setAppVersion(v); });
    }

    if (window.api && window.api.onUpdaterStatus) {
      const unsubscribe = window.api.onUpdaterStatus((data) => {
        if (!data) return;
        if (data.status === 'checking') {
          setUpdateStatus('checking');
        } else if (data.status === 'available') {
          setUpdateStatus('available');
          setUpdateInfo(data.info);
        } else if (data.status === 'not-available') {
          setUpdateStatus('up-to-date');
        } else if (data.status === 'downloading') {
          setUpdateStatus('downloading');
          if (data.progress) {
            setUpdateProgress(Math.round(data.progress.percent || 0));
            if (data.progress.bytesPerSecond) {
              setUpdateSpeed(`${(data.progress.bytesPerSecond / (1024 * 1024)).toFixed(1)} МБ/с`);
            }
          }
        } else if (data.status === 'downloaded') {
          setUpdateStatus('downloaded');
          setUpdateInfo(data.info);
        } else if (data.status === 'error') {
          setUpdateStatus('error');
          setUpdateError(data.error || 'Не удалось проверить обновления');
        }
      });
      return unsubscribe;
    }
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateError('');
    if (window.api && window.api.checkForUpdates) {
      try {
        const res = await window.api.checkForUpdates();
        if (res && res.status === 'dev-mode') {
          setUpdateStatus('dev-mode');
        } else if (res && res.status === 'error') {
          setUpdateStatus('error');
          setUpdateError(res.error || 'Ошибка связи с сервером обновлений');
        }
      } catch (err) {
        setUpdateStatus('error');
        setUpdateError(err.message || 'Ошибка проверки');
      }
    } else {
      setTimeout(() => setUpdateStatus('up-to-date'), 600);
    }
  };

  const handleStartDownload = async () => {
    setUpdateStatus('downloading');
    if (window.api && window.api.downloadUpdate) {
      await window.api.downloadUpdate();
    }
  };

  const handleApplyUpdate = () => {
    if (window.api && window.api.quitAndInstall) {
      window.api.quitAndInstall();
    }
  };

  const pickFolder = async (key) => {
    if (window.api && window.api.selectFolder) {
      const folder = await window.api.selectFolder(localSettings[key]);
      if (folder) {
        setLocalSettings((prev) => ({ ...prev, [key]: folder }));
      }
    }
  };

  const handlePickBgImage = async () => {
    setResolutionWarning(null);
    if (!window.api || !window.api.selectFiles) return;

    try {
      const files = await window.api.selectFiles('image');
      if (files && files.length > 0) {
        const filePath = files[0];
        
        // Read file directly as Base64 data: URL
        let dataUrl = null;
        if (window.api.readImageAsDataUrl) {
          dataUrl = await window.api.readImageAsDataUrl(filePath);
        }
        if (!dataUrl) {
          dataUrl = window.api.toMediaUrl(filePath);
        }

        // Verify image resolution (minimum 640 x 360)
        const img = new Image();
        img.onload = () => {
          if (img.width < 640 || img.height < 360) {
            setResolutionWarning(`Внимание: разрешение фото (${img.width} × ${img.height}) меньше рекомендуемого 640 × 360.`);
          } else {
            setResolutionWarning(null);
          }
          setBgImage(dataUrl);
          localStorage.setItem('convart_bg_image', dataUrl);
        };
        img.onerror = () => {
          setBgImage(dataUrl);
          localStorage.setItem('convart_bg_image', dataUrl);
        };
        img.src = dataUrl;
      }
    } catch (err) {
      console.error('Error selecting background:', err);
    }
  };

  const handleRemoveBgImage = () => {
    setBgImage('');
    localStorage.removeItem('convart_bg_image');
    setResolutionWarning(null);
  };

  const handleApply = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl p-6 flex flex-col max-h-[90vh] transition-colors duration-200 ${
        isLight
          ? 'bg-white text-slate-900 border-slate-200 shadow-2xl'
          : 'bg-[#0b0e17] text-white border-white/10 shadow-2xl'
      }`}>
        {/* Accent top stripe */}
        <div className="absolute top-0 left-6 right-6 h-1 rounded-full bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]" />

        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-subtle text-accent border border-accent glow-accent">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Настройки ConvArt
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Кастомизация оформления, пути сохранения и обновления
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isLight
                ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className={`flex items-center gap-1.5 pt-3 pb-2 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('customization')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'customization'
                ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Кастомизация</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paths')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'paths'
                ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Пути рендера</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('updates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>Обновления</span>
          </button>
        </div>

        {/* Body (with generous px-3 to prevent any box-shadow clipping) */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5 custom-scrollbar">
          {/* TAB 1: CUSTOMIZATION */}
          {activeTab === 'customization' && (
            <div className="space-y-5">
              {/* Theme Mode: Dark vs Light */}
              <div className="space-y-2">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isLight ? 'text-slate-800' : 'text-white'
                }`}>
                  <Sun className="w-3.5 h-3.5 text-accent" /> Тема интерфейса
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('dark');
                      localStorage.setItem('convart_theme_mode', 'dark');
                    }}
                    className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border transition cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-accent-subtle text-white border-accent glow-accent'
                        : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold">Тёмная тема</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('light');
                      localStorage.setItem('convart_theme_mode', 'light');
                    }}
                    className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border transition cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-accent-subtle text-slate-900 border-accent glow-accent'
                        : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold">Белая (Светлая) тема</span>
                  </button>
                </div>
              </div>

              {/* Accent Color Palette (No scale to prevent clipping, generous padding) */}
              <div className={`space-y-2.5 pt-3 border-t ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isLight ? 'text-slate-800' : 'text-white'
                }`}>
                  <Palette className="w-3.5 h-3.5 text-accent" /> Акцентный оттенок
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        theme === t.id
                          ? 'border-accent bg-accent-subtle ring-1 ring-accent glow-accent'
                          : isLight
                            ? 'border-slate-200 bg-slate-100/70 hover:bg-slate-200/80'
                            : 'border-white/5 bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full ring-2 ring-black/10 shadow"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className={`text-[10px] font-bold text-center truncate w-full ${
                        isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}>
                        {t.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Image customizer */}
              <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                    isLight ? 'text-slate-800' : 'text-white'
                  }`}>
                    <ImageIcon className="w-3.5 h-3.5 text-accent" /> Фото на фон
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Мин. 640 × 360
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {bgImage ? 'Пользовательский фон активен' : 'Стандартный фоновый градиент'}
                      </div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Изображение автоматически центрируется и заполняет окно без искажений.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {bgImage && (
                        <button
                          type="button"
                          onClick={handleRemoveBgImage}
                          className="p-2 rounded-xl text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 transition cursor-pointer"
                          title="Удалить фон"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handlePickBgImage}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-accent cursor-pointer"
                      >
                        {bgImage ? 'Сменить фото' : 'Выбрать фото...'}
                      </button>
                    </div>
                  </div>

                  {resolutionWarning && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{resolutionWarning}</span>
                    </div>
                  )}

                  {/* Sliders for Darkness and Blur (Active when background is selected) */}
                  {bgImage && (
                    <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                      {/* Darkness Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Затемнение фона:
                          </span>
                          <span className="font-mono text-accent font-bold">{bgDarkness}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={bgDarkness}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setBgDarkness(val);
                            localStorage.setItem('convart_bg_darkness', val);
                          }}
                          className="w-full accent-[var(--accent)] cursor-pointer"
                        />
                      </div>

                      {/* Blur Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Размытие фона (блюр):
                          </span>
                          <span className="font-mono text-accent font-bold">{bgBlur}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={bgBlur}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setBgBlur(val);
                            localStorage.setItem('convart_bg_blur', val);
                          }}
                          className="w-full accent-[var(--accent)] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATHS & RENDER SETTINGS */}
          {activeTab === 'paths' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isLight ? 'text-slate-800' : 'text-white'
                }`}>
                  <Folder className="w-4 h-4 text-accent" /> Пути сохранения по типам медиа
                </span>
                <label className={`flex items-center gap-2 text-xs cursor-pointer ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={localSettings.separateByType}
                    onChange={(e) => setLocalSettings({ ...localSettings, separateByType: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                  />
                  <span>Разделять по папкам</span>
                </label>
              </div>

              {localSettings.separateByType ? (
                <div className="space-y-3">
                  {/* Video Directory */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Film className="w-4 h-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <div className={`text-[11px] font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Папка для Видео
                        </div>
                        <div className={`text-[10px] font-mono truncate max-w-xs md:max-w-md ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {localSettings.videoDir || localSettings.defaultDir}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pickFolder('videoDir')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
                        isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      Обзор
                    </button>
                  </div>

                  {/* Audio Directory */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Music className="w-4 h-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <div className={`text-[11px] font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Папка для Аудио
                        </div>
                        <div className={`text-[10px] font-mono truncate max-w-xs md:max-w-md ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {localSettings.audioDir || localSettings.defaultDir}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pickFolder('audioDir')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
                        isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      Обзор
                    </button>
                  </div>

                  {/* Image Directory */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ImageIcon className="w-4 h-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <div className={`text-[11px] font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Папка для Фото & Графики
                        </div>
                        <div className={`text-[10px] font-mono truncate max-w-xs md:max-w-md ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {localSettings.imageDir || localSettings.defaultDir}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pickFolder('imageDir')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
                        isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      Обзор
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <div className={`text-[11px] font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Единая папка для всех файлов
                      </div>
                      <div className={`text-[10px] font-mono truncate max-w-xs md:max-w-md ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        {localSettings.defaultDir}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => pickFolder('defaultDir')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    Обзор
                  </button>
                </div>
              )}

              {/* Behavior */}
              <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Поведение по умолчанию
                </span>

                <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                }`}>
                  <div>
                    <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Сохранять рядом с оригиналом
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Помещать сконвертированные файлы в ту же папку, где лежит исходник
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.saveSameFolder}
                    onChange={(e) => setLocalSettings({ ...localSettings, saveSameFolder: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTO-UPDATES */}
          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isLight ? 'text-slate-800' : 'text-white'
                }`}>
                  <ArrowUpCircle className="w-4 h-4 text-accent" /> Центр обновлений ConvArt
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-slate-300'
                }`}>
                  v{appVersion}
                </span>
              </div>

              <div className={`p-4 rounded-2xl border space-y-3.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <span>ConvArt Studio by artmarboi</span>
                      {updateStatus === 'up-to-date' && (
                        <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Актуальная версия
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {updateStatus === 'idle' && 'Автоматическая проверка новых релизов через интернет.'}
                      {updateStatus === 'checking' && 'Поиск обновлений на сервере...'}
                      {updateStatus === 'up-to-date' && 'У вас установлена самая свежая версия программы.'}
                      {updateStatus === 'dev-mode' && 'Режим разработки активен. В релизной сборке обновления качаются автоматически.'}
                      {updateStatus === 'available' && `Найдена новая версия v${updateInfo?.version || ''}!`}
                      {updateStatus === 'downloading' && `Загрузка обновления: ${updateProgress}% ${updateSpeed ? `(${updateSpeed})` : ''}`}
                      {updateStatus === 'downloaded' && 'Обновление загружено! Нажмите кнопку для перезапуска.'}
                      {updateStatus === 'error' && (updateError || 'Сервер обновлений пока не настроен')}
                    </div>
                  </div>

                  {updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'error' || updateStatus === 'dev-mode' ? (
                    <button
                      type="button"
                      onClick={handleCheckUpdate}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                        isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Проверить</span>
                    </button>
                  ) : updateStatus === 'checking' ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                      <span>Поиск...</span>
                    </div>
                  ) : updateStatus === 'available' ? (
                    <button
                      type="button"
                      onClick={handleStartDownload}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold btn-accent text-white transition shrink-0 cursor-pointer"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span>Скачать</span>
                    </button>
                  ) : updateStatus === 'downloaded' ? (
                    <button
                      type="button"
                      onClick={handleApplyUpdate}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black transition shrink-0 cursor-pointer animate-pulse"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>Перезапустить</span>
                    </button>
                  ) : null}
                </div>

                {updateStatus === 'downloading' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-200"
                        style={{ width: `${updateProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`pt-3 border-t flex items-center justify-end gap-3 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold btn-accent cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Сохранить настройки</span>
          </button>
        </div>
      </div>
    </div>
  );
}
