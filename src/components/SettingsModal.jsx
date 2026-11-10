import React, { useState, useEffect } from 'react';
import { X, Settings, Folder, HardDrive, Check, Film, Music, Image as ImageIcon, Zap, Sparkles, RefreshCw, DownloadCloud, ArrowUpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsModal({
  settings,
  onSave,
  onClose,
  systemStatus,
}) {
  const [localSettings, setLocalSettings] = useState({
    defaultDir: settings.defaultDir || '',
    videoDir: settings.videoDir || '',
    audioDir: settings.audioDir || '',
    imageDir: settings.imageDir || '',
    separateByType: settings.separateByType ?? true,
    saveSameFolder: settings.saveSameFolder ?? false,
    preferredHw: settings.preferredHw || 'auto',
  });

  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, up-to-date, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateSpeed, setUpdateSpeed] = useState('');
  const [updateError, setUpdateError] = useState('');

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

  const handleApply = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0b0e17] border border-white/10 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-subtle text-accent border border-accent glow-accent">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Настройки рендера и студии</h3>
              <p className="text-xs text-slate-400">Настройка путей сохранения для каждого типа файлов и движка</p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-2">
          {/* Categorized Folders Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-accent" /> Пути сохранения по типам медиа
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
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
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Film className="w-4 h-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-white">Папка для Видео</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs md:max-w-md">
                        {localSettings.videoDir || localSettings.defaultDir}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => pickFolder('videoDir')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white shrink-0 transition cursor-pointer"
                  >
                    Обзор
                  </button>
                </div>

                {/* Audio Directory */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Music className="w-4 h-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-white">Папка для Аудио</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs md:max-w-md">
                        {localSettings.audioDir || localSettings.defaultDir}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => pickFolder('audioDir')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white shrink-0 transition cursor-pointer"
                  >
                    Обзор
                  </button>
                </div>

                {/* Image Directory */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ImageIcon className="w-4 h-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-white">Папка для Фото & Графики</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs md:max-w-md">
                        {localSettings.imageDir || localSettings.defaultDir}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => pickFolder('imageDir')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white shrink-0 transition cursor-pointer"
                  >
                    Обзор
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Folder className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-white">Единая папка для всех файлов</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs md:max-w-md">
                      {localSettings.defaultDir}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => pickFolder('defaultDir')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white shrink-0 transition cursor-pointer"
                >
                  Обзор
                </button>
              </div>
            )}
          </div>

          {/* Quick Options */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Поведение по умолчанию</span>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">Сохранять рядом с оригиналом</div>
                <div className="text-[11px] text-slate-400">Помещать сконвертированные файлы в ту же папку, где лежит исходник</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.saveSameFolder}
                onChange={(e) => setLocalSettings({ ...localSettings, saveSameFolder: e.target.checked })}
                className="w-4 h-4 accent-[var(--accent)] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Auto-Updater Section (Variant B) */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-accent" /> Центр обновлений ConvArt
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                v{appVersion}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>ConvArt Studio by artmarboi</span>
                    {updateStatus === 'up-to-date' && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Актуальная версия
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {updateStatus === 'idle' && 'Автоматическая проверка новых релизов через интернет'}
                    {updateStatus === 'checking' && 'Проверка доступных обновлений на сервере...'}
                    {updateStatus === 'up-to-date' && 'У вас установлена самая свежая версия программы.'}
                    {updateStatus === 'dev-mode' && 'Режим разработки активен. В релизной сборке обновления качаются автоматически.'}
                    {updateStatus === 'available' && `Найдена новая версия v${updateInfo?.version || ''}!`}
                    {updateStatus === 'downloading' && `Загрузка обновления: ${updateProgress}% ${updateSpeed ? `(${updateSpeed})` : ''}`}
                    {updateStatus === 'downloaded' && 'Обновление загружено! Нажмите кнопку для перезапуска.'}
                    {updateStatus === 'error' && (updateError || 'Сервер обновлений пока не настроен')}
                  </div>
                </div>

                {/* Updater action buttons */}
                {updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'error' || updateStatus === 'dev-mode' ? (
                  <button
                    type="button"
                    onClick={handleCheckUpdate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition shrink-0 cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold btn-accent text-white transition shrink-0 cursor-pointer"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Скачать</span>
                  </button>
                ) : updateStatus === 'downloaded' ? (
                  <button
                    type="button"
                    onClick={handleApplyUpdate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black transition shrink-0 cursor-pointer animate-pulse"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Перезапустить</span>
                  </button>
                ) : null}
              </div>

              {/* Progress bar when downloading update */}
              {updateStatus === 'downloading' && (
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-200"
                      style={{ width: `${updateProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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
            <span>Сохранить настройки</span>
          </button>
        </div>
      </div>
    </div>
  );
}
