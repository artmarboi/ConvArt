const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync, exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve frontend dist build if present
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Default directories
const downloadsDir = path.join(os.homedir(), 'Downloads', 'ConvArt');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const uploadsDir = path.join(os.tmpdir(), 'convart-uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Find ffmpeg/ffprobe executable
function resolveBinary(name) {
  try {
    execSync(`where.exe ${name}`, { stdio: 'pipe' });
    return name;
  } catch {
    const wingetPath = `C:\\Users\\Admin\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\${name}.exe`;
    if (fs.existsSync(wingetPath)) return wingetPath;
    return name;
  }
}

const FFMPEG_BIN = resolveBinary('ffmpeg');
const FFPROBE_BIN = resolveBinary('ffprobe');

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

// Active jobs tracker
const activeJobs = new Map();

// System status endpoint
app.get('/api/system/status', (req, res) => {
  const hw = detectHardwareSupport();
  let ffmpegVersion = 'Unknown';
  try {
    const verOut = execSync(`"${FFMPEG_BIN}" -version`, { encoding: 'utf8', stdio: 'pipe' });
    const match = verOut.match(/ffmpeg version ([^\s]+)/);
    if (match) ffmpegVersion = match[1];
  } catch {}

  res.json({
    online: true,
    ffmpegVersion,
    hardware: hw,
    defaultOutputDir: downloadsDir,
  });
});

// Probe file details
app.post('/api/media/probe', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: 'File path is required or does not exist' });
  }

  const stat = fs.statSync(filePath);
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ];

  exec(`"${FFPROBE_BIN}" ${args.map(a => `"${a}"`).join(' ')}`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to inspect media: ' + err.message });
    }

    try {
      const data = JSON.parse(stdout);
      const streams = data.streams || [];
      const format = data.format || {};

      const videoStream = streams.find(s => s.codec_type === 'video' && s.codec_name !== 'png' && s.codec_name !== 'mjpeg');
      const imageStream = streams.find(s => s.codec_type === 'video' && (s.codec_name === 'png' || s.codec_name === 'mjpeg' || s.codec_name === 'webp'));
      const audioStream = streams.find(s => s.codec_type === 'audio');

      let mediaType = 'unknown';
      const ext = path.extname(filePath).toLowerCase();

      const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.ico', '.svg'];
      const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.opus', '.m4a', '.wma'];
      const videoExts = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v', '.ts'];

      if (imageExts.includes(ext) || (!videoStream && imageStream && !audioStream)) {
        mediaType = 'image';
      } else if (videoStream || videoExts.includes(ext)) {
        mediaType = 'video';
      } else if (audioStream || audioExts.includes(ext)) {
        mediaType = 'audio';
      }

      res.json({
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
          pixFmt: videoStream.pix_fmt,
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
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse probe data: ' + e.message });
    }
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

// Open File Dialog (Windows Native)
app.post('/api/fs/select-files', (req, res) => {
  const { type } = req.body;
  let filter = 'All Supported Media (*.mp4;*.mkv;*.mov;*.webm;*.avi;*.mp3;*.wav;*.flac;*.jpg;*.png;*.webp)|*.mp4;*.mkv;*.mov;*.webm;*.avi;*.mp3;*.wav;*.flac;*.jpg;*.png;*.webp|All Files (*.*)|*.*';

  if (type === 'video') {
    filter = 'Video Files (*.mp4;*.mkv;*.mov;*.webm;*.avi;*.flv)|*.mp4;*.mkv;*.mov;*.webm;*.avi;*.flv';
  } else if (type === 'audio') {
    filter = 'Audio Files (*.mp3;*.wav;*.flac;*.aac;*.ogg;*.opus;*.m4a)|*.mp3;*.wav;*.flac;*.aac;*.ogg;*.opus;*.m4a';
  } else if (type === 'image') {
    filter = 'Image Files (*.jpg;*.jpeg;*.png;*.webp;*.avif;*.gif;*.bmp)|*.jpg;*.jpeg;*.png;*.webp;*.avif;*.gif;*.bmp';
  }

  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Multiselect = $true
    $dialog.Filter = "${filter}"
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
      $dialog.FileNames | ConvertTo-Json -Compress
    } else {
      "[]"
    }
  `;

  exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '`"')}"`, (err, stdout) => {
    if (err) return res.json({ files: [] });
    try {
      const raw = stdout.trim();
      let files = [];
      if (raw.startsWith('[')) {
        files = JSON.parse(raw);
      } else if (raw.length > 0 && raw !== '[]') {
        files = [raw.replace(/"/g, '')];
      }
      res.json({ files });
    } catch {
      res.json({ files: [] });
    }
  });
});

// Select destination folder dialog
app.post('/api/fs/select-folder', (req, res) => {
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "Select Destination Folder"
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
      $dialog.SelectedPath
    }
  `;

  exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '`"')}"`, (err, stdout) => {
    if (err) return res.json({ folder: downloadsDir });
    const folder = stdout.trim();
    res.json({ folder: folder || downloadsDir });
  });
});

// Reveal in File Explorer
app.post('/api/fs/reveal', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: 'File does not exist' });
  }
  exec(`explorer.exe /select,"${filePath}"`);
  res.json({ success: true });
});

// Start conversion job
app.post('/api/convert/start', (req, res) => {
  const {
    inputPath,
    outputFolder = downloadsDir,
    targetFormat,
    mediaType,
    preset = 'balanced',
    settings = {},
    totalDuration = 0,
  } = req.body;

  if (!inputPath || !fs.existsSync(inputPath)) {
    return res.status(400).json({ error: 'Input file not found' });
  }

  const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const ext = targetFormat.toLowerCase();
  let outputPath = path.join(outputFolder, `${baseName}_converted.${ext}`);

  // Prevent overwriting
  let counter = 1;
  while (fs.existsSync(outputPath)) {
    outputPath = path.join(outputFolder, `${baseName}_compressed_${counter}.${ext}`);
    counter++;
  }

  const hw = detectHardwareSupport();
  const ffmpegArgs = ['-y', '-i', inputPath];

  // Configure FFmpeg flags based on media type & settings
  if (mediaType === 'video') {
    applyVideoSettings(ffmpegArgs, targetFormat, preset, settings, hw, totalDuration);
  } else if (mediaType === 'audio') {
    applyAudioSettings(ffmpegArgs, targetFormat, preset, settings);
  } else if (mediaType === 'image') {
    applyImageSettings(ffmpegArgs, targetFormat, preset, settings);
  }

  // Progress monitoring arguments
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
    totalDuration: totalDuration,
    size: 0,
    startTime: Date.now(),
    error: null,
    stderrLogs: [],
  };

  activeJobs.set(jobId, jobInfo);

  // Spawn ffmpeg
  const child = spawn(FFMPEG_BIN, ffmpegArgs);
  jobInfo.child = child;

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
      } else if (key === 'total_size') {
        jobInfo.size = parseInt(val) || 0;
      } else if (key === 'progress' && val === 'end') {
        jobInfo.progress = 100;
        jobInfo.status = 'completed';
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    jobInfo.stderrLogs.push(text);
    if (text.includes('Error') || text.includes('Invalid') || text.includes('failed')) {
      jobInfo.lastErrorLine = text.trim();
    }
  });

  child.on('close', (code) => {
    delete jobInfo.child;
    if (code === 0) {
      jobInfo.status = 'completed';
      jobInfo.progress = 100;
      try {
        const outStat = fs.statSync(outputPath);
        jobInfo.outputSize = outStat.size;
      } catch {}
    } else if (jobInfo.status !== 'cancelled') {
      jobInfo.status = 'failed';
      const lastFew = jobInfo.stderrLogs.slice(-3).join('\n');
      jobInfo.error = jobInfo.lastErrorLine || lastFew || `FFmpeg process exited with code ${code}`;
    }
  });

  res.json({
    jobId,
    outputPath,
    status: 'started',
  });
});

// Helper for video flags
function applyVideoSettings(args, targetFormat, preset, settings, hw, totalDuration) {
  // If target format is MP3, rip audio directly
  if (targetFormat === 'mp3') {
    args.push('-vn', '-c:a', 'libmp3lame', '-b:a', settings.audioBitrate || '192k');
    return;
  }

  // If target format is GIF, generate high quality palette
  if (targetFormat === 'gif') {
    args.push('-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', '-an');
    return;
  }

  const hwAccel = settings.hwAccel || 'auto';
  let vcodec = settings.videoCodec || 'auto';
  const crf = settings.crf ?? (preset === 'ultra-compress' ? 28 : (preset === 'high-quality' ? 18 : 23));

  // WebM format adjustments
  if (targetFormat === 'webm') {
    if (vcodec === 'auto' || vcodec === 'vp9') {
      args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', crf.toString());
    } else if (vcodec === 'av1' && hw.svtav1) {
      args.push('-c:v', 'libsvtav1', '-crf', crf.toString());
    } else {
      args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', crf.toString());
    }

    if (settings.removeAudio) {
      args.push('-an');
    } else {
      args.push('-c:a', 'libopus', '-b:a', settings.audioBitrate || '128k');
    }
    return;
  }

  // Target size calculation (e.g. Discord 8MB or Telegram 50MB)
  if (settings.targetSizeMB && totalDuration > 0) {
    const targetBits = settings.targetSizeMB * 8 * 1024 * 1024;
    const audioBitrate = 128 * 1024;
    const videoBitrate = Math.max(100 * 1024, Math.floor((targetBits / totalDuration) - audioBitrate));
    args.push('-b:v', `${Math.floor(videoBitrate / 1000)}k`, '-maxrate', `${Math.floor(videoBitrate / 1000 * 1.5)}k`, '-bufsize', `${Math.floor(videoBitrate / 1000 * 2)}k`);
  }

  // Standard MP4 / MKV / MOV video encoding
  if (vcodec === 'auto' || vcodec === 'h264') {
    if (hwAccel !== 'cpu' && hw.nvenc) {
      args.push('-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', crf.toString());
    } else if (hwAccel !== 'cpu' && hw.qsv) {
      args.push('-c:v', 'h264_qsv', '-global_quality', crf.toString());
    } else if (hwAccel !== 'cpu' && hw.amf) {
      args.push('-c:v', 'h264_amf', '-qp_i', crf.toString(), '-qp_p', crf.toString());
    } else {
      args.push('-c:v', 'libx264', '-crf', crf.toString(), '-preset', 'medium');
    }
  } else if (vcodec === 'hevc' || vcodec === 'h265') {
    if (hwAccel !== 'cpu' && hw.nvenc) {
      args.push('-c:v', 'hevc_nvenc', '-preset', 'p5', '-cq', crf.toString());
    } else if (hwAccel !== 'cpu' && hw.qsv) {
      args.push('-c:v', 'hevc_qsv', '-global_quality', crf.toString());
    } else if (hwAccel !== 'cpu' && hw.amf) {
      args.push('-c:v', 'hevc_amf');
    } else {
      args.push('-c:v', 'libx265', '-crf', crf.toString(), '-preset', 'medium');
    }
  } else if (vcodec === 'av1') {
    if (hw.svtav1) {
      args.push('-c:v', 'libsvtav1', '-crf', crf.toString(), '-preset', '6');
    } else {
      args.push('-c:v', 'libx264', '-crf', crf.toString());
    }
  } else if (vcodec === 'copy') {
    args.push('-c:v', 'copy');
  }

  // Resolution resize filter
  if (settings.resolution && settings.resolution !== 'original') {
    args.push('-vf', `scale=${settings.resolution}:force_original_aspect_ratio=decrease,pad=${settings.resolution}:(ow-iw)/2:(oh-ih)/2`);
  }

  // FPS
  if (settings.fps && settings.fps !== 'original') {
    args.push('-r', settings.fps.toString());
  }

  // Audio stream options
  if (settings.removeAudio) {
    args.push('-an');
  } else {
    args.push('-c:a', 'aac', '-b:a', settings.audioBitrate || '160k');
  }

  // Web faststart for mp4
  if (targetFormat === 'mp4') {
    args.push('-movflags', '+faststart');
  }
}

// Helper for audio flags
function applyAudioSettings(args, targetFormat, preset, settings) {
  const bitrate = settings.audioBitrate || (preset === 'podcast' ? '96k' : (preset === 'high-quality' ? '320k' : '192k'));

  if (targetFormat === 'mp3') {
    args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
  } else if (targetFormat === 'flac') {
    args.push('-c:a', 'flac');
  } else if (targetFormat === 'wav') {
    args.push('-c:a', 'pcm_s16le');
  } else if (targetFormat === 'opus' || targetFormat === 'ogg') {
    args.push('-c:a', 'libopus', '-b:a', bitrate);
  } else if (targetFormat === 'aac' || targetFormat === 'm4a') {
    args.push('-c:a', 'aac', '-b:a', bitrate);
  }

  if (settings.sampleRate) {
    args.push('-ar', settings.sampleRate.toString());
  }
  if (settings.channels) {
    args.push('-ac', settings.channels.toString());
  }
}

// Helper for image flags
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

  // Resize filter
  if (settings.imageWidth || settings.imageHeight) {
    const w = settings.imageWidth || -1;
    const h = settings.imageHeight || -1;
    args.push('-vf', `scale=${w}:${h}`);
  }

  // Strip metadata (EXIF)
  if (settings.stripMetadata !== false) {
    args.push('-map_metadata', '-1');
  }
}

// Get job progress
app.get('/api/convert/status/:jobId', (req, res) => {
  const job = activeJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    fps: job.fps,
    currentTime: job.currentTime,
    outputPath: job.outputPath,
    outputSize: job.outputSize || 0,
    error: job.error,
  });
});

// Cancel job
app.post('/api/convert/cancel/:jobId', (req, res) => {
  const job = activeJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (job.child) {
    job.child.kill('SIGTERM');
  }
  job.status = 'cancelled';
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[ConvArt Backend] Running on http://localhost:${PORT}`);
  console.log(`[ConvArt Backend] FFmpeg Path: ${FFMPEG_BIN}`);
});
