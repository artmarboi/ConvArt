const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
      return file.path || '';
    } catch (e) {
      return file.path || '';
    }
  },
  toMediaUrl: (filePath) => {
    if (!filePath) return '';
    return 'media-loader://local/?path=' + encodeURIComponent(filePath);
  },
  getSystemStatus: () => ipcRenderer.invoke('get-system-status'),
  selectFiles: (type) => ipcRenderer.invoke('select-files', type),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readImageAsDataUrl: (filePath) => ipcRenderer.invoke('read-image-data-url', filePath),
  probeFile: (filePath) => ipcRenderer.invoke('probe-file', filePath),
  startConversion: (payload) => ipcRenderer.invoke('start-conversion', payload),
  cancelConversion: (jobId) => ipcRenderer.invoke('cancel-conversion', jobId),
  losslessCut: (payload) => ipcRenderer.invoke('lossless-cut', payload),
  extractFrame: (payload) => ipcRenderer.invoke('extract-frame', payload),
  generateFastPreview: (filePath) => ipcRenderer.invoke('generate-fast-preview', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
  onProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('conversion-progress', handler);
    return () => ipcRenderer.removeListener('conversion-progress', handler);
  },
  // Web Downloader APIs (yt-dlp powered)
  getWebMediaInfo: (url) => ipcRenderer.invoke('get-web-media-info', url),
  startWebDownload: (payload) => ipcRenderer.invoke('start-web-download', payload),
  cancelWebDownload: (downloadId) => ipcRenderer.invoke('cancel-web-download', downloadId),
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  // Auto-updater APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdaterStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('updater-status', handler);
    return () => ipcRenderer.removeListener('updater-status', handler);
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  setWindowTheme: (theme) => ipcRenderer.send('set-window-theme', theme),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
