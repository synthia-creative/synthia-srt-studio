import { newRow, type SubtitleRow } from '../core/types';
import { formatTime, parseTime } from '../core/time';
import { validateRows } from '../core/validation';

// Parser compatibility follows SRT Tap Timer (MIT, Copyright (c) 2026 cityedge).
// Rewritten for integer milliseconds, literal text preservation and strict failed-import safety.
export function parseSrt(raw: string): SubtitleRow[] {
  const lines = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const timeLine = /^\s*(.*?)\s*-->\s*(\S+)(?:\s+.*)?$/;
  const rows: SubtitleRow[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    if (/^\d+$/.test(lines[i].trim()) && timeLine.test(lines[i + 1] ?? '')) i++;
    const match = timeLine.exec(lines[i]);
    if (!match) throw new Error(`SRT ${i + 1}行目の時刻行を読み取れません。現在の字幕は保持されます。`);
    const startMs = parseTime(match[1]), endMs = parseTime(match[2]);
    const text: string[] = [];
    i++;
    while (i < lines.length && lines[i].trim()) {
      if (timeLine.test(lines[i]) || (/^\d+$/.test(lines[i].trim()) && timeLine.test(lines[i + 1] ?? ''))) break;
      text.push(lines[i++]);
    }
    rows.push({ ...newRow(text.join('\n'), 'imported'), startMs, endMs });
  }
  if (!rows.length) throw new Error('SRT字幕が見つかりません。');
  return rows;
}
export function writeSrt(rows: readonly SubtitleRow[], bom = false): string {
  if (!rows.length) throw new Error('出力する字幕がありません。');
  if (validateRows(rows).some(issue => issue.severity === 'error')) throw new Error('未完成または不正な字幕を修正してから出力してください。');
  return (bom ? '\uFEFF' : '') + rows.map((row, index) => `${index + 1}\n${formatTime(row.startMs)} --> ${formatTime(row.endMs)}\n${row.text}\n`).join('\n');
}
