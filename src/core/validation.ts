import type { SubtitleRow, ValidationIssue } from './types';
export function validateRows(rows: readonly SubtitleRow[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const intervals: { row: SubtitleRow; index: number }[] = [];
  rows.forEach((row, index) => {
    const add = (severity: 'error' | 'warning', message: string) => issues.push({ rowId: row.id, rowNumber: index + 1, severity, message });
    if (!row.text.trim()) add('error', '歌詞が空です。');
    else if (row.text.split(/\r\n?|\n/).some(line => !line.trim())) add('error', '字幕本文の空行を削除してください。標準SRTでは空行が字幕の区切りになります。');
    if (row.startMs === null || row.endMs === null) add('error', '開始・終了時刻が未設定です。');
    for (const value of [row.startMs, row.endMs]) {
      if (value !== null && (!Number.isSafeInteger(value) || value < 0)) add('error', '時刻は0以上の整数ミリ秒が必要です。');
    }
    if (row.startMs !== null && row.endMs !== null) {
      if (row.endMs <= row.startMs) add('error', '終了時刻は開始時刻より後に設定してください。');
      else intervals.push({ row, index });
    }
    if (index > 0 && row.startMs !== null && rows[index - 1].startMs !== null && row.startMs < rows[index - 1].startMs!) add('warning', '開始時刻が前の行より早くなっています。');
  });
  // Sweep by time, so non-adjacent and reordered overlaps are detected too.
  intervals.sort((a, b) => a.row.startMs! - b.row.startMs!);
  let furthest: typeof intervals[number] | undefined;
  for (const current of intervals) {
    if (furthest && current.row.startMs! < furthest.row.endMs!) {
      issues.push({ rowId: current.row.id, rowNumber: current.index + 1, severity: 'warning', message: `${furthest.index + 1}行目と時刻が重複しています。` });
    }
    if (!furthest || current.row.endMs! > furthest.row.endMs!) furthest = current;
  }
  return issues;
}
