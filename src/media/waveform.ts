export interface Waveform { peaks: Float32Array; durationMs: number }
const cache = new WeakMap<File, Waveform>();
export async function analyzeWaveform(file: File, durationSeconds: number, signal: AbortSignal): Promise<Waveform> {
  const existing = cache.get(file); if (existing) return existing;
  // Keep compressed input and decoded PCM bounded. Playback continues for larger media.
  if (file.size > 64 * 1024 * 1024 || durationSeconds > 600) throw new Error('大きな音源の波形解析を省略しました。再生・字幕編集は利用できます（64MB／10分まで）。');
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const count = Math.min(16000, Math.max(800, Math.ceil(decoded.duration * 20)));
    const peaks = new Float32Array(count), step = decoded.length / count;
    const channels = Array.from({ length: Math.min(decoded.numberOfChannels, 4) }, (_, i) => decoded.getChannelData(i));
    for (let bucket = 0; bucket < count; bucket++) {
      if (bucket % 512 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      }
      const start = Math.floor(bucket * step), end = Math.min(decoded.length, Math.floor((bucket + 1) * step));
      const stride = Math.max(1, Math.floor((end - start) / 100));
      let peak = 0;
      for (const channel of channels) for (let i = start; i < end; i += stride) peak = Math.max(peak, Math.abs(channel[i]));
      peaks[bucket] = peak;
    }
    const result = { peaks, durationMs: Math.round(decoded.duration * 1000) }; cache.set(file, result); return result;
  } finally { await context.close(); }
}
