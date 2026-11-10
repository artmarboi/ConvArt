const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync, exec } = require('child_process');
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  console.log('electron-updater not loaded:', e.message);
}

app.setName('ConvArt');

// Register media-loader protocol for local streaming
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-loader',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
]);

// Chromium flags
app.commandLine.appendSwitch('disable-features', 'NetworkServiceSandbox');
app.commandLine.appendSwitch('disable-http-cache');

// User data path
const userDataPath = path.join(os.homedir(), 'AppData', 'Local', 'ConvArtStudio');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
app.setPath('userData', userDataPath);

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow;

// Resolve binary executable (bundled with app or system)
function resolveBinary(name) {
  const exeName = name.endsWith('.exe') ? name : `${name}.exe`;

  const searchPaths = [
    // 1) Packaged electron app: process.resourcesPath/bin/
    path.join(process.resourcesPath || '', 'bin', exeName),
    // 2) Next to the ConvArt.exe: <exeDir>/bin/ or <exeDir>/resources/bin/
    path.join(path.dirname(process.execPath || ''), 'bin', exeName),
    path.join(path.dirname(process.execPath || ''), 'resources', 'bin', exeName),
    // 3) Project local bin/: bin/
    path.join(__dirname, '..', 'bin', exeName),
  ];

  for (const candidate of searchPaths) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 4) System PATH
  try {
    const stdout = execSync(`where.exe ${name}`, { stdio: 'pipe' }).toString().split('\r\n')[0].trim();
    if (stdout && fs.existsSync(stdout)) return stdout;
  } catch {}

  // 5) Winget Gyan.FFmpeg fallback
  const wingetPath = `C:\\Users\\Admin\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\${exeName}`;
  if (fs.existsSync(wingetPath)) return wingetPath;

  return name;
}

const FFMPEG_BIN = resolveBinary('ffmpeg');
const FFPROBE_BIN = resolveBinary('ffprobe');
const YTDLP_BIN = resolveBinary('convart-ytdlp');
const YTDLP_WRAPPER = path.join(__dirname, '../scripts/ytdlp_wrapper.py');

function spawnYtdlp(args, options = {}) {
  if (YTDLP_BIN && fs.existsSync(YTDLP_BIN) && YTDLP_BIN.endsWith('.exe')) {
    return spawn(YTDLP_BIN, args, {
      ...options,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...options.env },
    });
  }
  return spawn('python', [YTDLP_WRAPPER, ...args], {
    ...options,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...options.env },
  });
}

// Default directories
const downloadsDir = path.join(os.homedir(), 'Downloads', 'ConvArt');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Hardware acceleration detection cache
let detectedHw = null;
function detectHardwareSupport() {
  if (detectedHw) return detectedHw;
  try {
    const output = execSync(`"${FFMPEG_BIN}" -encoders`, { encoding: 'utf8', stdio: 'pipe' });
    detectedHw = {
      nvenc: output.includes('h264_nvenc'),
      amf: output.includes('h264_amf'),
      qsv: output.includes('h264_qsv'),
      svtav1: output.includes('libsvtav1'),
      libx265: output.includes('libx265'),
      libx264: output.includes('libx264'),
      libwebp: output.includes('libwebp'),
    };
  } catch (err) {
    detectedHw = { nvenc: false, amf: false, qsv: false, svtav1: false, libx265: true, libx264: true, libwebp: true };
  }
  return detectedHw;
}

const activeJobs = new Map();
const activeDownloads = new Map();

function createWindow() {
  const iconCandidates = [
    path.join(__dirname, '../ConvArt.ico'),
    path.join(process.resourcesPath || '', 'ConvArt.ico'),
    path.join(path.dirname(process.execPath || ''), 'ConvArt.ico'),
    path.join(__dirname, 'ConvArt.ico'),
  ];
  const iconPath = iconCandidates.find(p => p && fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 890,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#07090e',
    title: 'ConvArt — Media Studio by artmarboi',
    icon: iconPath || undefined,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const devMode = process.env.ELECTRON_DEV === 'true';
  if (devMode) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Window controls
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

// Status
ipcMain.handle('get-system-status', async () => {
  const hw = detectHardwareSupport();
  return {
    hardware: hw,
    defaultOutputDir: downloadsDir,
  };
});

// Auto-updater handlers & events
ipcMain.handle('get-app-version', () => app.getVersion());

if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'checking' });
  });
  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'available', info });
  });
  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'not-available', info });
  });
  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'error', error: err ? err.message : 'Ошибка обновления' });
  });
  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'downloading', progress });
  });
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'downloaded', info });
  });
}

ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    return { status: 'dev-mode', message: 'Режим разработки: проверка обновлений работает только в упакованном приложении' };
  }
  if (!autoUpdater) {
    return { status: 'error', error: 'Модуль автообновления не инициализирован' };
  }
  try {
    const res = await autoUpdater.checkForUpdates();
    return { status: 'success', updateInfo: res ? res.updateInfo : null };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
});

ipcMain.handle('download-update', async () => {
  if (!autoUpdater) return { success: false, error: 'Модуль не загружен' };
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('quit-and-install', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall(false, true);
  }
});

// File picker
ipcMain.handle('select-files', async (_event, type) => {
  if (!mainWindow) return [];
  let filters = [
    { name: 'All Media Files', extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'tiff'] },
    { name: 'Video Files', extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv', 'wmv', 'm4v'] },
    { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'] },
    { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'tiff'] },
    { name: 'All Files', extensions: ['*'] },
  ];
  if (type === 'video') filters = [filters[1], filters[0]];
  else if (type === 'audio') filters = [filters[2], filters[0]];
  else if (type === 'image') filters = [filters[3], filters[0]];

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters,
  });
  if (result.canceled) return [];
  return result.filePaths;
});

// Folder picker
ipcMain.handle('select-folder', async (_event, defaultPath) => {
  if (!mainWindow) return defaultPath || downloadsDir;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: defaultPath || downloadsDir,
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return defaultPath || downloadsDir;
  }
  return result.filePaths[0];
});

// Reveal in Explorer
ipcMain.handle('reveal-file', async (_event, filePath) => {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else if (fs.existsSync(path.dirname(filePath))) {
    shell.openPath(path.dirname(filePath));
  }
});

// Helper: Parse metadata directly from ffmpeg stderr without needing ffprobe
function parseFfmpegStderr(stderrText, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.ico', '.svg'];
  const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.opus', '.m4a', '.wma'];
  const videoExts = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v', '.ts'];

  let duration = 0;
  const durMatch = stderrText.match(/Duration:\s*(\d+):(\d+):([\d\.]+)/);
  if (durMatch) {
    const hours = parseInt(durMatch[1], 10);
    const minutes = parseInt(durMatch[2], 10);
    const seconds = parseFloat(durMatch[3]);
    duration = hours * 3600 + minutes * 60 + seconds;
  }

  let bitrate = 0;
  const brMatch = stderrText.match(/bitrate:\s*(\d+)\s*kb\/s/);
  if (brMatch) {
    bitrate = parseInt(brMatch[1], 10) * 1000;
  }

  let video = null;
  const videoMatch = stderrText.match(/Stream\s+#\d+:\d+.*?: Video:\s*([^,\s]+)[^,\n]*(?:,\s*[^,\n]*)*?,\s*(\d{2,5})x(\d{2,5})/);
  if (videoMatch) {
    const codec = videoMatch[1].toLowerCase();
    const width = parseInt(videoMatch[2], 10);
    const height = parseInt(videoMatch[3], 10);
    let fps = 0;
    const fpsMatch = stderrText.match(/(\d+(?:\.\d+)?)\s*fps/);
    if (fpsMatch) {
      fps = parseFloat(fpsMatch[1]);
    }
    video = { codec, width, height, fps };
  }

  let audio = null;
  const audioMatch = stderrText.match(/Stream\s+#\d+:\d+.*?: Audio:\s*([^,\s]+)[^,\n]*,\s*(\d+)\s*Hz,\s*([^,\n]+)/);
  if (audioMatch) {
    const codec = audioMatch[1].toLowerCase();
    const sampleRate = parseInt(audioMatch[2], 10);
    const chanStr = audioMatch[3].toLowerCase();
    let channels = 2;
    if (chanStr.includes('mono')) channels = 1;
    else if (chanStr.includes('stereo')) channels = 2;
    else if (chanStr.includes('5.1')) channels = 6;
    else if (chanStr.includes('7.1')) channels = 8;
    else {
      const cMatch = chanStr.match(/(\d+)\s*channels/);
      if (cMatch) channels = parseInt(cMatch[1], 10);
    }
    let audioBitrate = 0;
    const abrMatch = stderrText.match(/Audio:.*?,\s*(\d+)\s*kb\/s/);
    if (abrMatch) {
      audioBitrate = parseInt(abrMatch[1], 10) * 1000;
    }
    audio = { codec, sampleRate, channels, bitrate: audioBitrate };
  }

  let mediaType = 'video';
  if (imageExts.includes(ext) || (!video && !audio && imageExts.includes(ext))) {
    mediaType = 'image';
  } else if (audio && !video && !videoExts.includes(ext)) {
    mediaType = 'audio';
  } else if (!video && !audio) {
    if (audioExts.includes(ext)) mediaType = 'audio';
    else if (imageExts.includes(ext)) mediaType = 'image';
    else mediaType = 'video';
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    extension: ext.replace('.', ''),
    mediaType,
    size: stat.size,
    duration,
    bitrate,
    video,
    audio,
  };
}

// Probe file metadata (uses ffmpeg natively, fallback to ffprobe)
ipcMain.handle('probe-file', async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Файл не найден: ' + filePath);
  }

  const stat = fs.statSync(filePath);

  // If ffprobe exists, use it; otherwise use ffmpeg -hide_banner -i
  const hasFfprobe = FFPROBE_BIN && fs.existsSync(FFPROBE_BIN);

  if (hasFfprobe) {
    return new Promise((resolve) => {
      exec(`"${FFPROBE_BIN}" -v quiet -print_format json -show_format -show_streams "${filePath}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (!err && stdout) {
          try {
            const data = JSON.parse(stdout);
            const streams = data.streams || [];
            const format = data.format || {};

            const videoStream = streams.find(s => s.codec_type === 'video' && s.codec_name !== 'png' && s.codec_name !== 'mjpeg');
            const imageStream = streams.find(s => s.codec_type === 'video' && (s.codec_name === 'png' || s.codec_name === 'mjpeg' || s.codec_name === 'webp'));
            const audioStream = streams.find(s => s.codec_type === 'audio');

            let mediaType = 'video';
            const ext = path.extname(filePath).toLowerCase();
            const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.ico', '.svg'];
            const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.opus', '.m4a', '.wma'];
            const videoExts = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v', '.ts'];

            if (imageExts.includes(ext) || (!videoStream && imageStream && !audioStream)) {
              mediaType = 'image';
            } else if (audioStream && !videoStream && !videoExts.includes(ext)) {
              mediaType = 'audio';
            }

            return resolve({
              filePath,
              fileName: path.basename(filePath),
              extension: ext.replace('.', ''),
              mediaType,
              size: stat.size,
              duration: parseFloat(format.duration) || 0,
              bitrate: parseInt(format.bit_rate) || 0,
              video: videoStream ? {
                codec: videoStream.codec_name,
                width: videoStream.width,
                height: videoStream.height,
                fps: evalFps(videoStream.r_frame_rate || videoStream.avg_frame_rate),
              } : (imageStream ? {
                codec: imageStream.codec_name,
                width: imageStream.width,
                height: imageStream.height,
              } : null),
              audio: audioStream ? {
                codec: audioStream.codec_name,
                channels: audioStream.channels,
                sampleRate: audioStream.sample_rate,
                bitrate: parseInt(audioStream.bit_rate) || 0,
              } : null,
            });
          } catch {}
        }

        // Fallback to ffmpeg
        exec(`"${FFMPEG_BIN}" -hide_banner -i "${filePath}"`, { maxBuffer: 5 * 1024 * 1024 }, (_fErr, _fStdout, fStderr) => {
          resolve(parseFfmpegStderr(fStderr || '', filePath, stat));
        });
      });
    });
  }

  // Native lightweight ffmpeg metadata extraction
  return new Promise((resolve, reject) => {
    exec(`"${FFMPEG_BIN}" -hide_banner -i "${filePath}"`, { maxBuffer: 5 * 1024 * 1024 }, (_err, _stdout, stderr) => {
      try {
        const result = parseFfmpegStderr(stderr || '', filePath, stat);
        resolve(result);
      } catch (e) {
        reject(new Error('Ошибка чтения метаданных: ' + e.message));
      }
    });
  });
});

function evalFps(fpsStr) {
  if (!fpsStr) return 0;
  const parts = fpsStr.split('/');
  if (parts.length === 2 && parseFloat(parts[1]) > 0) {
    return Math.round((parseFloat(parts[0]) / parseFloat(parts[1])) * 100) / 100;
  }
  return parseFloat(fpsStr) || 0;
}

// Start conversion job
ipcMain.handle('start-conversion', async (_event, payload) => {
  const {
    inputPath,
    outputFolder = downloadsDir,
    targetFormat,
    mediaType,
    preset = 'balanced',
    settings = {},
    totalDuration = 0,
  } = payload;

  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error('Исходный файл не существует: ' + inputPath);
  }

  const stat = fs.statSync(inputPath);
  const originalSize = stat.size;

  const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const ext = targetFormat.toLowerCase();
  
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  let outputPath = path.join(outputFolder, `${baseName}_converted.${ext}`);
  let counter = 1;
  while (fs.existsSync(outputPath)) {
    outputPath = path.join(outputFolder, `${baseName}_compressed_${counter}.${ext}`);
    counter++;
  }

  const hw = detectHardwareSupport();
  const ffmpegArgs = ['-y', '-i', inputPath];

  if (mediaType === 'video') {
    applyVideoSettings(ffmpegArgs, targetFormat, preset, settings, hw, totalDuration, originalSize);
  } else if (mediaType === 'audio') {
    applyAudioSettings(ffmpegArgs, targetFormat, preset, settings);
  } else if (mediaType === 'image') {
    applyImageSettings(ffmpegArgs, targetFormat, preset, settings);
  }

  ffmpegArgs.push('-progress', 'pipe:1', outputPath);

  const jobInfo = {
    jobId,
    inputPath,
    outputPath,
    mediaType,
    status: 'processing',
    progress: 0,
    speed: '1.0x',
    fps: 0,
    currentTime: 0,
    totalDuration,
    stderrLogs: [],
  };

  const child = spawn(FFMPEG_BIN, ffmpegArgs);
  jobInfo.child = child;
  activeJobs.set(jobId, jobInfo);

  let progressBuffer = '';
  child.stdout.on('data', (chunk) => {
    progressBuffer += chunk.toString();
    const lines = progressBuffer.split('\n');
    progressBuffer = lines.pop();

    for (const line of lines) {
      const [key, val] = line.trim().split('=');
      if (!key || !val) continue;

      if (key === 'out_time_us') {
        const us = parseInt(val);
        const secs = us / 1000000;
        jobInfo.currentTime = secs;
        if (totalDuration > 0) {
          jobInfo.progress = Math.min(99, Math.round((secs / totalDuration) * 100));
        }
      } else if (key === 'fps') {
        jobInfo.fps = parseFloat(val) || 0;
      } else if (key === 'speed') {
        jobInfo.speed = val.trim();
      } else if (key === 'progress' && val === 'end') {
        jobInfo.progress = 100;
        jobInfo.status = 'completed';
      }
    }

    if (mainWindow) {
      mainWindow.webContents.send('conversion-progress', {
        jobId,
        status: jobInfo.status,
        progress: jobInfo.progress,
        speed: jobInfo.speed,
        fps: jobInfo.fps,
        currentTime: jobInfo.currentTime,
        outputPath: jobInfo.outputPath,
      });
    }
  });

  child.stderr.on('data', (chunk) => {
    jobInfo.stderrLogs.push(chunk.toString());
  });

  child.on('close', (code) => {
    delete jobInfo.child;
    if (code === 0) {
      jobInfo.status = 'completed';
      jobInfo.progress = 100;
      let outputSize = 0;
      try {
        outputSize = fs.statSync(outputPath).size;
      } catch {}

      if (mainWindow) {
        mainWindow.webContents.send('conversion-progress', {
          jobId,
          status: 'completed',
          progress: 100,
          outputPath,
          outputSize,
        });
      }
    } else if (jobInfo.status !== 'cancelled') {
      jobInfo.status = 'failed';
      const lastErr = jobInfo.stderrLogs.slice(-4).join('\n') || `FFmpeg exited with code ${code}`;
      if (mainWindow) {
        mainWindow.webContents.send('conversion-progress', {
          jobId,
          status: 'failed',
          progress: 0,
          error: lastErr,
        });
      }
    }
  });

  return { jobId, outputPath };
});

ipcMain.handle('cancel-conversion', async (_event, jobId) => {
  const job = activeJobs.get(jobId);
  if (job && job.child) {
    job.child.kill('SIGTERM');
    job.status = 'cancelled';
  }
  return { success: true };
});

// Enhanced video settings with guaranteed compression ceilings
function applyVideoSettings(args, targetFormat, preset, settings, hw, totalDuration, originalSize) {
  if (targetFormat === 'mp3') {
    args.push('-vn', '-c:a', 'libmp3lame', '-b:a', settings.audioBitrate || '192k');
    return;
  }

  if (targetFormat === 'gif') {
    args.push('-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', '-an');
    return;
  }

  const hwAccel = settings.hwAccel || 'auto';
  let vcodec = settings.videoCodec || 'auto';

  let originalBitrateKbps = 2500;
  if (originalSize > 0 && totalDuration > 0) {
    originalBitrateKbps = Math.floor((originalSize * 8) / (totalDuration * 1000));
  }

  if (settings.targetSizeMB && totalDuration > 0) {
    const targetBits = settings.targetSizeMB * 8 * 1024 * 1024;
    const audioBitrate = 96 * 1024;
    const videoBitrate = Math.max(80 * 1024, Math.floor((targetBits / totalDuration) - audioBitrate));
    const kbps = Math.floor(videoBitrate / 1000);
    args.push('-b:v', `${kbps}k`, '-maxrate', `${Math.floor(kbps * 1.3)}k`, '-bufsize', `${kbps * 2}k`);
  } else if (preset === 'ultra-compress') {
    const capBitrateKbps = Math.max(250, Math.floor(originalBitrateKbps * 0.45));
    if (hwAccel !== 'cpu' && hw.nvenc) {
      args.push('-c:v', 'h264_nvenc', '-rc', 'vbr', '-cq', '30', '-b:v', `${capBitrateKbps}k`, '-maxrate', `${Math.floor(capBitrateKbps * 1.2)}k`, '-bufsize', `${capBitrateKbps * 2}k`);
    } else {
      args.push('-c:v', 'libx264', '-crf', '28', '-maxrate', `${capBitrateKbps}k`, '-bufsize', `${capBitrateKbps * 2}k`, '-preset', 'faster');
    }
  } else if (preset === 'balanced') {
    const capBitrateKbps = Math.max(400, Math.floor(originalBitrateKbps * 0.70));
    if (hwAccel !== 'cpu' && hw.nvenc) {
      args.push('-c:v', 'h264_nvenc', '-rc', 'vbr', '-cq', '24', '-b:v', `${capBitrateKbps}k`, '-maxrate', `${Math.floor(capBitrateKbps * 1.25)}k`, '-bufsize', `${capBitrateKbps * 2}k`);
    } else {
      args.push('-c:v', 'libx264', '-crf', '23', '-maxrate', `${capBitrateKbps}k`, '-bufsize', `${capBitrateKbps * 2}k`, '-preset', 'medium');
    }
  } else if (preset === 'high-quality') {
    const crf = settings.crf || 18;
    if (hwAccel !== 'cpu' && hw.nvenc) {
      args.push('-c:v', 'h264_nvenc', '-preset', 'p6', '-cq', crf.toString());
    } else {
      args.push('-c:v', 'libx264', '-crf', crf.toString(), '-preset', 'slow');
    }
  } else {
    const crf = settings.crf ?? 23;
    if (vcodec === 'auto' || vcodec === 'h264') {
      if (hwAccel !== 'cpu' && hw.nvenc) {
        args.push('-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', crf.toString());
      } else {
        args.push('-c:v', 'libx264', '-crf', crf.toString(), '-preset', 'medium');
      }
    } else if (vcodec === 'hevc' || vcodec === 'h265') {
      if (hwAccel !== 'cpu' && hw.nvenc) {
        args.push('-c:v', 'hevc_nvenc', '-preset', 'p5', '-cq', crf.toString());
      } else {
        args.push('-c:v', 'libx265', '-crf', crf.toString(), '-preset', 'medium');
      }
    } else if (vcodec === 'av1') {
      if (hw.svtav1) args.push('-c:v', 'libsvtav1', '-crf', crf.toString(), '-preset', '6');
      else args.push('-c:v', 'libx264', '-crf', crf.toString());
    } else if (vcodec === 'copy') {
      args.push('-c:v', 'copy');
    }
  }

  if (targetFormat === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', (settings.crf || 30).toString());
    if (settings.removeAudio) args.push('-an');
    else args.push('-c:a', 'libopus', '-b:a', settings.audioBitrate || '128k');
    return;
  }

  if (settings.resolution && settings.resolution !== 'original') {
    args.push('-vf', `scale=${settings.resolution}:force_original_aspect_ratio=decrease,pad=${settings.resolution}:(ow-iw)/2:(oh-ih)/2`);
  }

  if (settings.fps && settings.fps !== 'original') {
    args.push('-r', settings.fps.toString());
  }

  if (settings.removeAudio) {
    args.push('-an');
  } else {
    args.push('-c:a', 'aac', '-b:a', settings.audioBitrate || '160k');
  }

  if (targetFormat === 'mp4') {
    args.push('-movflags', '+faststart');
  }
}

function applyAudioSettings(args, targetFormat, preset, settings) {
  const bitrate = settings.audioBitrate || (preset === 'podcast' ? '96k' : (preset === 'high-quality' ? '320k' : '192k'));

  if (targetFormat === 'mp3') args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
  else if (targetFormat === 'flac') args.push('-c:a', 'flac');
  else if (targetFormat === 'wav') args.push('-c:a', 'pcm_s16le');
  else if (targetFormat === 'opus' || targetFormat === 'ogg') args.push('-c:a', 'libopus', '-b:a', bitrate);
  else if (targetFormat === 'aac' || targetFormat === 'm4a') args.push('-c:a', 'aac', '-b:a', bitrate);

  if (settings.sampleRate) args.push('-ar', settings.sampleRate.toString());
  if (settings.channels) args.push('-ac', settings.channels.toString());
}

function applyImageSettings(args, targetFormat, preset, settings) {
  const quality = settings.imageQuality ?? (preset === 'ultra-compress' ? 65 : (preset === 'high-quality' ? 95 : 82));

  if (targetFormat === 'webp') {
    args.push('-c:v', 'libwebp', '-quality', quality.toString());
  } else if (targetFormat === 'avif') {
    args.push('-c:v', 'libsvtav1', '-crf', Math.round(63 - (quality * 0.63)).toString());
  } else if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
    const qscale = Math.max(2, Math.min(31, Math.round(31 - (quality * 0.29))));
    args.push('-q:v', qscale.toString());
  } else if (targetFormat === 'png') {
    args.push('-compression_level', '9');
  }

  if (settings.imageWidth || settings.imageHeight) {
    const w = settings.imageWidth || -1;
    const h = settings.imageHeight || -1;
    args.push('-vf', `scale=${w}:${h}`);
  }

  if (settings.stripMetadata !== false) {
    args.push('-map_metadata', '-1');
  }
}

// ── Web Downloader IPC Handlers (yt-dlp with DoH DNS resolver) ───────
ipcMain.handle('get-web-media-info', async (_event, url) => {
  if (!url) throw new Error('URL обязателен');

  const args = [
    '--no-warnings',
    '--dump-json',
    '--no-playlist',
    '--no-download',
    '--socket-timeout', '15',
    '--retries', '5',
    '--no-check-certificates',
    '--ffmpeg-location', path.dirname(FFMPEG_BIN),
    url,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawnYtdlp(args, { timeout: 70000 });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString('utf8')));
    proc.stderr.on('data', (d) => (stderr += d.toString('utf8')));

    proc.on('close', (code) => {
      // Even if code is non-zero (due to warnings on stderr), try parsing stdout first
      if (stdout && stdout.trim()) {
        try {
          const info = JSON.parse(stdout.trim());
          const heights = new Set();
          let hasRealVideo = false;

          for (const f of info.formats || []) {
            if (f.vcodec && f.vcodec !== 'none') {
              hasRealVideo = true;
              if (f.height) heights.add(f.height);
            }
          }

          // If domain is soundcloud or audio-only platform
          const domain = (info.extractor || '').toLowerCase();
          const urlLower = url.toLowerCase();
          if (domain.includes('soundcloud') || domain.includes('spotify') || urlLower.includes('soundcloud.com') || urlLower.includes('spotify.com') || !hasRealVideo) {
            hasRealVideo = false;
          }

          const sorted = [...heights].sort((a, b) => b - a);
          const videoQualities = hasRealVideo ? sorted.map((h) => ({
            id: `v_${h}`,
            type: 'video',
            label: h >= 2160 ? '4K Ultra HD' : h >= 1440 ? '2K 1440p' : `${h}p`,
            format: `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`,
            ext: 'mp4',
          })) : [];

          if (hasRealVideo && videoQualities.length === 0) {
            videoQualities.push({ id: 'v_best', type: 'video', label: 'Лучшее качество (MP4)', format: 'bestvideo+bestaudio/best', ext: 'mp4' });
          }

          // Extensive audio formats with metadata tagging
          const audioQualities = [
            { id: 'a_mp3_320', type: 'audio', label: 'MP3 (320 kbps Studio Max)', ext: 'mp3', audioQuality: '320' },
            { id: 'a_mp3_256', type: 'audio', label: 'MP3 (256 kbps High Quality)', ext: 'mp3', audioQuality: '256' },
            { id: 'a_mp3_192', type: 'audio', label: 'MP3 (192 kbps Standard)', ext: 'mp3', audioQuality: '192' },
            { id: 'a_mp3_128', type: 'audio', label: 'MP3 (128 kbps Compact)', ext: 'mp3', audioQuality: '128' },
            { id: 'a_flac', type: 'audio', label: 'FLAC (Lossless Studio)', ext: 'flac' },
            { id: 'a_wav', type: 'audio', label: 'WAV (Uncompressed 24-bit)', ext: 'wav' },
            { id: 'a_m4a', type: 'audio', label: 'AAC / M4A (Apple High-Fidelity)', ext: 'm4a' },
            { id: 'a_ogg', type: 'audio', label: 'OGG (Vorbis)', ext: 'ogg' },
            { id: 'a_opus', type: 'audio', label: 'OPUS (Clear Voice & Music)', ext: 'opus' },
          ];

          return resolve({
            title: info.title || 'Медиафайл',
            thumbnail: info.thumbnail || null,
            duration: info.duration || 0,
            uploader: info.uploader || info.channel || 'Неизвестно',
            extractor: info.extractor_key || info.extractor || 'Web',
            hasVideo: hasRealVideo,
            url,
            videoQualities,
            audioQualities,
          });
        } catch (err) {
          // JSON parse failed, proceed to rejection
        }
      }

      const cleanError = (stderr || '').split('\n').filter(l => !l.includes('WARNING')).join(' ').trim();
      return reject(new Error('Не удалось получить информацию: ' + (cleanError || 'Проверьте ссылку или интернет-соединение')));
    });

    proc.on('error', (err) => reject(new Error('yt-dlp недоступен: ' + err.message)));
  });
});

ipcMain.handle('start-web-download', async (_event, payload) => {
  const { url, quality, outputFolder = downloadsDir, downloadId = 'dl_' + Date.now() } = payload;

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const outputTemplate = path.join(outputFolder, '%(title)s.%(ext)s');

  const args = [
    '--no-warnings',
    '--no-playlist',
    '--newline',
    '--socket-timeout', '15',
    '--retries', '5',
    '--no-check-certificates',
    '--add-metadata',
    '--embed-metadata', // Embed metadata (tags, artist, track, title)
    '--embed-thumbnail', // Embed cover artwork directly into audio/video file!
    '--ffmpeg-location', path.dirname(FFMPEG_BIN),
    '-o', outputTemplate,
  ];

  if (quality.format) {
    args.push('-f', quality.format);
  }

  if (quality.type === 'audio') {
    args.push('-x');
    if (quality.ext === 'mp3') {
      args.push('--audio-format', 'mp3');
      if (quality.audioQuality) args.push('--audio-quality', quality.audioQuality);
    } else if (quality.ext === 'flac') {
      args.push('--audio-format', 'flac');
    } else if (quality.ext === 'wav') {
      args.push('--audio-format', 'wav');
    } else if (quality.ext === 'm4a') {
      args.push('--audio-format', 'm4a');
    } else if (quality.ext === 'ogg') {
      args.push('--audio-format', 'vorbis');
    } else if (quality.ext === 'opus') {
      args.push('--audio-format', 'opus');
    }
  } else {
    args.push('--merge-output-format', 'mp4');
  }

  args.push(url);

  const proc = spawnYtdlp(args);
  activeDownloads.set(downloadId, proc);

  let downloadedFilePath = null;
  let lastErrorText = '';

  proc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split('\n');
    for (const line of lines) {
      const match = line.match(/\[download\]\s+([\d\.]+)%\s+of\s+~?([\d\.]+\w+)\s+at\s+([\d\.]+\w+\/s)\s+ETA\s+([\d:]+)/);
      if (match) {
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            status: 'downloading',
            percent: parseFloat(match[1]),
            totalSize: match[2],
            speed: match[3],
            eta: match[4],
          });
        }
      }

      if (line.includes('[download] Destination:') || line.includes('[Merger] Merging formats into') || line.includes('[ExtractAudio] Destination:')) {
        const fileMatch = line.match(/(?:Destination:\s+|into\s+)"?([^"\r\n]+)"?/);
        if (fileMatch && fileMatch[1]) {
          downloadedFilePath = fileMatch[1].trim();
        }
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    lastErrorText = chunk.toString();
  });

  proc.on('close', (code) => {
    activeDownloads.delete(downloadId);
    if (mainWindow) {
      if (code === 0) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          status: 'completed',
          percent: 100,
          filePath: downloadedFilePath,
        });
      } else {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          status: 'failed',
          error: lastErrorText || `Загрузка прервана с кодом ${code}`,
        });
      }
    }
  });

  return { downloadId };
});

ipcMain.handle('cancel-web-download', async (_event, downloadId) => {
  const proc = activeDownloads.get(downloadId);
  if (proc) {
    proc.kill('SIGTERM');
    activeDownloads.delete(downloadId);
  }
  return { success: true };
});

// ── Native Media Streamer with HTTP 206 Range Support ────────────────
app.whenReady().then(() => {
  protocol.handle('media-loader', async (request) => {
    try {
      let fileUrl = request.url.replace(/^media-loader:\/\//i, '');
      fileUrl = decodeURI(fileUrl);
      if (/^\/[a-zA-Z]:/.test(fileUrl)) fileUrl = fileUrl.substring(1);
      fileUrl = fileUrl.replace(/\//g, '\\');

      if (!fs.existsSync(fileUrl)) {
        return new Response('File not found', { status: 404 });
      }

      const stat = fs.statSync(fileUrl);
      const range = request.headers.get('range');
      const ext = path.extname(fileUrl).toLowerCase();

      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mkv': 'video/x-matroska',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.opus': 'audio/opus',
        '.m4a': 'audio/mp4',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.avif': 'image/avif',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(fileUrl, { start, end });

        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType,
          },
        });
      }

      const fileStream = fs.createReadStream(fileUrl);
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new Response(webStream, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': stat.size.toString(),
          'Content-Type': contentType,
        },
      });
    } catch (err) {
      console.error('media-loader error:', err);
      return new Response(err.message, { status: 500 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
