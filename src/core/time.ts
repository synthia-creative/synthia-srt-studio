export function milliseconds(seconds: number): number {
  if (!Number.isFinite(seconds)) throw new Error('音源時刻を取得できません。');
  return Math.max(0, Math.round(seconds * 1000));
}
export function formatTime(ms: number | null): string {
  if (ms === null) return '';
  if (!Number.isSafeInteger(ms) || ms < 0) throw new Error('時刻は0以上の整数ミリ秒が必要です。');
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
// MIT-compatible timestamp conventions informed by cityedge/SRT Tap Timer; see THIRD_PARTY_NOTICES.md.
export function parseTime(input: string): number | null {
  const text = input.trim();
  if (!text || /^--(?::--){1,2}[,.]---$/.test(text)) return null;
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/.exec(text);
  if (!match) throw new Error('HH:MM:SS,mmm または MM:SS,mmm で入力してください。');
  const hours = Number(match[1] || 0), minutes = Number(match[2]), seconds = Number(match[3]);
  if (minutes >= 60 || seconds >= 60) throw new Error('分と秒は0〜59で入力してください。');
  const ms = hours * 3600000 + minutes * 60000 + seconds * 1000 + Number(match[4].padEnd(3, '0'));
  if (!Number.isSafeInteger(ms)) throw new Error('時刻が大きすぎます。');
  return ms;
}
