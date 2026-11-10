export const THEMES = [
  { id: 'red', name: 'ConvArt Red', color: '#ff2a4b' },
  { id: 'amber', name: 'Solar Amber', color: '#f59e0b' },
  { id: 'cyber', name: 'Cyber Neon', color: '#00f0ff' },
  { id: 'purple', name: 'Ultra Violet', color: '#c084fc' },
  { id: 'matrix', name: 'Matrix Emerald', color: '#10b981' },
  { id: 'oled', name: 'Mono Pure', color: '#ffffff' },
];

export const FORMAT_OPTIONS = {
  video: [
    { value: 'mp4', label: 'MP4 (Universal)', desc: 'Compatible with all devices and browsers' },
    { value: 'webm', label: 'WebM (Web Ready)', desc: 'Optimized for HTML5 video and discord' },
    { value: 'mkv', label: 'MKV (Container)', desc: 'Supports multi-track audio & subtitles' },
    { value: 'mov', label: 'MOV (Apple / ProRes)', desc: 'Standard for macOS and QuickTime' },
    { value: 'gif', label: 'GIF (Animated)', desc: 'Convert video clip into soundless GIF' },
    { value: 'mp3', label: 'MP3 (Extract Audio)', desc: 'Rip audio track from video' },
  ],
  audio: [
    { value: 'mp3', label: 'MP3', desc: 'Universally supported 128k - 320k' },
    { value: 'wav', label: 'WAV', desc: 'Uncompressed lossless studio standard' },
    { value: 'flac', label: 'FLAC', desc: 'Lossless audio compression' },
    { value: 'aac', label: 'AAC', desc: 'High efficiency Apple audio' },
    { value: 'opus', label: 'OPUS', desc: 'Modern ultra-clear low bitrate voice & music' },
    { value: 'ogg', label: 'OGG', desc: 'Open source Vorbis container' },
  ],
  image: [
    { value: 'webp', label: 'WebP', desc: 'Modern web image, up to 70% smaller than JPG' },
    { value: 'avif', label: 'AVIF', desc: 'Next-gen extreme compression without artifacts' },
    { value: 'jpg', label: 'JPG / JPEG', desc: 'Standard photo format' },
    { value: 'png', label: 'PNG', desc: 'Lossless format with transparency support' },
    { value: 'gif', label: 'GIF', desc: 'Classic image format' },
  ],
};

export const PRESETS = {
  video: [
    { id: 'balanced', name: 'Smart Balanced', desc: 'Best compromise between quality & file size (~50% shrink)', crf: 23 },
    { id: 'ultra-compress', name: 'Maximum Shrink', desc: 'Aggressive compression (up to 80% shrink)', crf: 28 },
    { id: 'discord-8mb', name: 'Discord Cap (8 MB)', desc: 'Auto-adjusts bitrate to fit strictly into 8 MB', targetSizeMB: 7.8 },
    { id: 'discord-50mb', name: 'Telegram / Web (50 MB)', desc: 'Auto-adjusts bitrate to fit into 50 MB', targetSizeMB: 49 },
    { id: 'high-quality', name: 'Near Lossless (HQ)', desc: 'Visually indistinguishable from source', crf: 18 },
    { id: 'custom', name: 'Custom Tweaks...', desc: 'Configure CRF, bitrate, resolution & FPS manually' },
  ],
  audio: [
    { id: 'balanced', name: 'Standard (192 kbps)', desc: 'Balanced high quality for music and streaming', bitrate: '192k' },
    { id: 'high-quality', name: 'Studio Max (320 kbps)', desc: 'Maximum fidelity MP3/AAC bitrate', bitrate: '320k' },
    { id: 'podcast', name: 'Voice & Podcast (96 kbps)', desc: 'Optimized voice clarity, tiny file size', bitrate: '96k' },
    { id: 'custom', name: 'Custom Bitrate...', desc: 'Fine-tune channels and sample rate' },
  ],
  image: [
    { id: 'balanced', name: 'Web Balanced (80%)', desc: 'Ideal for websites & messengers (imperceptible loss)', quality: 80 },
    { id: 'ultra-compress', name: 'Ultra Shrink (65%)', desc: 'Tiny file size, great for avatars and previews', quality: 65 },
    { id: 'high-quality', name: 'Maximum Quality (95%)', desc: 'Crisp photography preservation', quality: 95 },
    { id: 'custom', name: 'Custom Dimensions...', desc: 'Resize width, height and strip EXIF' },
  ],
};

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
