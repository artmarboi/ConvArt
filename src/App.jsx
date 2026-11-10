import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import DropZone from './components/DropZone';
import QueueItem from './components/QueueItem';
import InspectorModal from './components/InspectorModal';
import MediaPreviewModal from './components/MediaPreviewModal';
import SettingsModal from './components/SettingsModal';
import WebDownloader from './components/WebDownloader';
import BatchBar from './components/BatchBar';
import { Trash, Wand2 } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('convart_theme') || 'red');
  const [activeTab, setActiveTab] = useState('converter'); // 'converter' | 'downloader'
  const [systemStatus, setSystemStatus] = useState(null);
  const [outputDir, setOutputDir] = useState('');
  const [saveSameFolder, setSaveSameFolder] = useState(() => localStorage.getItem('convart_save_same') === 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Categorized render destinations
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('convart_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      defaultDir: '',
      videoDir: '',
      audioDir: '',
      imageDir: '',
      separateByType: true,
      saveSameFolder: false,
    };
  });

  const [queue, setQueue] = useState([]);
  const [inspectingItem, setInspectingItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [globalPreset, setGlobalPreset] = useState('balanced');

  // Apply theme to HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('convart_theme', theme);
  }, [theme]);

  // Persist settings
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('convart_settings', JSON.stringify(newSettings));
    if (newSettings.defaultDir) {
      setOutputDir(newSettings.defaultDir);
    }
    if (newSettings.saveSameFolder !== undefined) {
      setSaveSameFolder(newSettings.saveSameFolder);
    }
  };

  // Load system status
  useEffect(() => {
    if (window.api && window.api.getSystemStatus) {
      window.api.getSystemStatus()
        .then((data) => {
          setSystemStatus(data);
          if (data.defaultOutputDir) {
            setOutputDir(data.defaultOutputDir);
            setSettings((prev) => ({
              ...prev,
              defaultDir: prev.defaultDir || data.defaultOutputDir,
              videoDir: prev.videoDir || data.defaultOutputDir,
              audioDir: prev.audioDir || data.defaultOutputDir,
              imageDir: prev.imageDir || data.defaultOutputDir,
            }));
          }
        })
        .catch((err) => console.error('Failed to get status:', err));
    }
  }, []);

  // Subscribe to real-time progress events from Electron IPC
  useEffect(() => {
    if (!window.api || !window.api.onProgress) return;

    const unsubscribe = window.api.onProgress((data) => {
      const { jobId, status, progress, speed, fps, outputPath, outputSize, error } = data;

      setQueue((prev) =>
        prev.map((item) => {
          if (item.currentJobId !== jobId) return item;
          return {
            ...item,
            status: status || item.status,
            progress: progress !== undefined ? progress : item.progress,
            speed: speed || item.speed,
            fps: fps !== undefined ? fps : item.fps,
            outputPath: outputPath || item.outputPath,
            outputSize: outputSize || item.outputSize,
            error: error || item.error,
          };
        })
      );
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Handle selected or dropped files
  const handleFilesSelected = async (filePaths) => {
    const newItems = [];

    for (const filePath of filePaths) {
      if (!filePath) continue;
      if (queue.some((q) => q.filePath === filePath)) continue;

      try {
        if (!window.api || !window.api.probeFile) {
          throw new Error('API недоступно в среде');
        }

        const probeData = await window.api.probeFile(filePath);

        let targetFormat = 'mp4';
        if (probeData.mediaType === 'image') targetFormat = 'webp';
        if (probeData.mediaType === 'audio') targetFormat = 'mp3';

        newItems.push({
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          ...probeData,
          targetFormat,
          preset: 'balanced',
          settings: {
            crf: 23,
            videoCodec: 'auto',
            hwAccel: 'auto',
            resolution: 'original',
            fps: 'original',
            removeAudio: false,
            audioBitrate: '160k',
            imageQuality: 82,
            stripMetadata: true,
          },
          status: 'idle',
          progress: 0,
          speed: '',
          fps: 0,
          outputPath: null,
          outputSize: 0,
          error: null,
          currentJobId: null,
        });
      } catch (err) {
        console.error('Probe error for', filePath, err);
      }
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  const handleUpdateFormat = (id, targetFormat) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, targetFormat } : item))
    );
  };

  const handleUpdatePreset = (id, preset) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let newSettings = { ...item.settings };
        if (preset === 'ultra-compress') {
          newSettings.crf = 28;
          newSettings.imageQuality = 65;
        } else if (preset === 'high-quality') {
          newSettings.crf = 18;
          newSettings.imageQuality = 95;
        } else if (preset === 'discord-8mb') {
          newSettings.targetSizeMB = 7.8;
        } else if (preset === 'discord-50mb') {
          newSettings.targetSizeMB = 49;
        } else if (preset === 'balanced') {
          newSettings.crf = 23;
          newSettings.imageQuality = 82;
          delete newSettings.targetSizeMB;
        }
        return { ...item, preset, settings: newSettings };
      })
    );
  };

  const handleSaveItemSettings = (id, newSettings) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, settings: newSettings, preset: 'custom' } : item))
    );
  };

  const getDestinationFolderForItem = (item) => {
    if (saveSameFolder && item.filePath) {
      const lastSlash = Math.max(item.filePath.lastIndexOf('\\'), item.filePath.lastIndexOf('/'));
      if (lastSlash > 0) {
        return item.filePath.substring(0, lastSlash);
      }
    }
    if (settings.separateByType) {
      if (item.mediaType === 'video' && settings.videoDir) return settings.videoDir;
      if (item.mediaType === 'audio' && settings.audioDir) return settings.audioDir;
      if (item.mediaType === 'image' && settings.imageDir) return settings.imageDir;
    }
    return settings.defaultDir || outputDir;
  };

  // Start conversion
  const startConversion = async (id) => {
    const item = queue.find((i) => i.id === id);
    if (!item) return;

    setQueue((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'processing', progress: 0, error: null } : i))
    );

    try {
      if (!window.api || !window.api.startConversion) {
        throw new Error('API конвертера недоступно');
      }

      const targetFolder = getDestinationFolderForItem(item);

      const res = await window.api.startConversion({
        inputPath: item.filePath,
        outputFolder: targetFolder,
        targetFormat: item.targetFormat,
        mediaType: item.mediaType,
        preset: item.preset,
        settings: item.settings,
        totalDuration: item.duration || 0,
      });

      setQueue((prev) =>
        prev.map((i) => (i.id === id ? { ...i, currentJobId: res.jobId } : i))
      );
    } catch (err) {
      setQueue((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'failed', error: err.message } : i))
      );
    }
  };

  const handleCancel = (id) => {
    const item = queue.find((i) => i.id === id);
    if (item && item.currentJobId && window.api && window.api.cancelConversion) {
      window.api.cancelConversion(item.currentJobId);
    }
    setQueue((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'idle', progress: 0 } : i))
    );
  };

  const handleRemove = (id) => {
    handleCancel(id);
    setQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((i) => i.status !== 'completed'));
  };

  const handleClearAll = () => {
    queue.forEach((item) => handleCancel(item.id));
    setQueue([]);
  };

  const handleConvertAll = async () => {
    setIsProcessingBatch(true);
    const pending = queue.filter((i) => i.status === 'idle');

    for (const item of pending) {
      await new Promise((resolve) => {
        startConversion(item.id);
        const checkDone = setInterval(() => {
          setQueue((current) => {
            const currentItem = current.find((c) => c.id === item.id);
            if (currentItem && (currentItem.status === 'completed' || currentItem.status === 'failed')) {
              clearInterval(checkDone);
              resolve();
            }
            return current;
          });
        }, 300);
      });
    }

    setIsProcessingBatch(false);
  };

  const handleReveal = (filePath) => {
    if (!filePath || !window.api || !window.api.revealFile) return;
    window.api.revealFile(filePath);
  };

  const handleApplyGlobalPreset = (presetKey) => {
    setGlobalPreset(presetKey);
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status !== 'idle') return item;
        let newSettings = { ...item.settings };
        if (presetKey === 'ultra-compress') {
          newSettings.crf = 28;
          newSettings.imageQuality = 65;
        } else if (presetKey === 'high-quality') {
          newSettings.crf = 18;
          newSettings.imageQuality = 95;
        } else if (presetKey === 'discord-8mb') {
          newSettings.targetSizeMB = 7.8;
        } else if (presetKey === 'discord-50mb') {
          newSettings.targetSizeMB = 49;
        } else if (presetKey === 'balanced') {
          newSettings.crf = 23;
          newSettings.imageQuality = 82;
          delete newSettings.targetSizeMB;
        }
        return { ...item, preset: presetKey, settings: newSettings };
      })
    );
  };

  const isQueueEmpty = queue.length === 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#07090e] text-slate-100 overflow-hidden select-none selection:bg-[var(--accent)] selection:text-slate-950">
      <TitleBar
        systemStatus={systemStatus}
        currentTheme={theme}
        setTheme={setTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main scrollable body with visible styled scrollbar */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
        {/* Tab 1: Local Converter & Compressor */}
        <div className={`flex-1 flex flex-col ${activeTab === 'converter' ? 'flex' : 'hidden'} ${
          isQueueEmpty ? 'min-h-[calc(100vh-6rem)] items-center justify-center' : 'gap-5'
        }`}>
          <DropZone onFilesSelected={handleFilesSelected} queueCount={queue.length} />

          {queue.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide text-white uppercase flex items-center gap-2">
                  <span>Список файлов ({queue.length})</span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5 text-accent" /> Применить ко всем:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyGlobalPreset('balanced')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    globalPreset === 'balanced'
                      ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  Оптимально
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyGlobalPreset('ultra-compress')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    globalPreset === 'ultra-compress'
                      ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  Макс. сжатие
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyGlobalPreset('discord-8mb')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    globalPreset === 'discord-8mb'
                      ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  Discord 8МБ
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyGlobalPreset('high-quality')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    globalPreset === 'high-quality'
                      ? 'bg-accent-subtle text-accent border border-accent glow-accent'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  HQ Качество
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 ml-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                  title="Очистить весь список"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {queue.length > 0 && (
            <div className="flex-1 flex flex-col gap-3 pb-32">
              {queue.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  onUpdateFormat={handleUpdateFormat}
                  onUpdatePreset={handleUpdatePreset}
                  onOpenInspector={setInspectingItem}
                  onStartSingle={startConversion}
                  onCancel={handleCancel}
                  onRemove={handleRemove}
                  onReveal={handleReveal}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tab 2: Web Media Downloader (Kept mounted via CSS display) */}
        <div className={`flex-1 flex flex-col ${activeTab === 'downloader' ? 'flex' : 'hidden'}`}>
          <WebDownloader
            outputDir={settings.separateByType && settings.audioDir ? settings.audioDir : (settings.defaultDir || outputDir)}
            onSendToQueue={(downloadedPath) => {
              handleFilesSelected([downloadedPath]);
              setActiveTab('converter');
            }}
          />
        </div>
      </main>

      {/* Settings Modal (Configurable render destinations per file type) */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
          systemStatus={systemStatus}
        />
      )}

      {/* Pro Inspector Modal */}
      {inspectingItem && (
        <InspectorModal
          item={inspectingItem}
          systemStatus={systemStatus}
          onClose={() => setInspectingItem(null)}
          onSave={handleSaveItemSettings}
        />
      )}

      {/* Media Preview Modal */}
      {previewItem && (
        <MediaPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onReveal={handleReveal}
        />
      )}

      {/* Sticky Bottom Batch Toolbar for Converter */}
      {activeTab === 'converter' && queue.length > 0 && (
        <BatchBar
          queue={queue}
          onConvertAll={handleConvertAll}
          onClearCompleted={handleClearCompleted}
          isProcessingBatch={isProcessingBatch}
        />
      )}
    </div>
  );
}
