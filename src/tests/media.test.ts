import { expect, it } from 'vitest';
import { analyzeWaveform } from '../media/waveform';
it('skips oversized or long media before decoding so playback can continue independently', async () => {
  const signal = new AbortController().signal;
  await expect(analyzeWaveform({ size: 65 * 1024 * 1024 } as File, 300, signal)).rejects.toThrow('波形解析を省略');
  await expect(analyzeWaveform({ size: 100 } as File, 601, signal)).rejects.toThrow('波形解析を省略');
});
it('does not start a cancelled waveform decode', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(analyzeWaveform({ size: 100 } as File, 8, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});
