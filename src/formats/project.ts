import type { Project, Settings, SubtitleRow, Section } from '../core/types';
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('プロジェクトのデータ構造が不正です。');
  return value as RecordValue;
};
const string = (v: unknown, limit = 1000000): string => { if (typeof v !== 'string' || v.length > limit) throw new Error('文字列の形式または長さが不正です。'); return v; };
const bool = (v: unknown): boolean => { if (typeof v !== 'boolean') throw new Error('設定値の形式が不正です。'); return v; };
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max) throw new Error('整数値の形式または範囲が不正です。'); return v; };
const nullableTime = (v: unknown) => v === null ? null : integer(v);
const nullableId = (v: unknown) => v === null ? null : string(v, 200);
const choice = <T extends string>(v: unknown, options: T[]): T => { if (!options.includes(v as T)) throw new Error('未対応の設定値です。'); return v as T; };
const date = (v: unknown): string => { const value = string(v, 100); if (!Number.isFinite(Date.parse(value))) throw new Error('日時の形式が不正です。'); return value; };
export function parseProject(raw: string): Project {
  if (raw.length > 20000000) throw new Error('プロジェクトファイルは20MB以内で読み込んでください。');
  const p = record(JSON.parse(raw.replace(/^\uFEFF/, '')));
  if (p.schemaVersion !== 1) throw new Error('このプロジェクト形式には対応していません（schemaVersion）。');
  if (!Array.isArray(p.rows) || p.rows.length > 20000 || !Array.isArray(p.sections) || p.sections.length > 20000) throw new Error('字幕行・セクションの形式または件数が不正です。');
  const rows: SubtitleRow[] = p.rows.map(v => {
    const r = record(v);
    return { id: string(r.id, 200), text: string(r.text), startMs: nullableTime(r.startMs), endMs: nullableTime(r.endMs),
      source: choice(r.source, ['manual', 'imported', 'suggested']), editState: choice(r.editState, ['draft', 'edited', 'reviewed']),
      confirmed: bool(r.confirmed), locked: bool(r.locked), updatedAt: date(r.updatedAt), sectionId: nullableId(r.sectionId) };
  });
  const ids = new Set(rows.map(r => r.id));
  if (ids.size !== rows.length || rows.some(r => !r.id)) throw new Error('字幕IDが重複または空になっています。');
  const sections: Section[] = p.sections.map(v => { const s = record(v); return { id: string(s.id, 200), label: string(s.label, 300), sourceLine: integer(s.sourceLine, 1), beforeRowId: nullableId(s.beforeRowId) }; });
  const sectionIds = new Set(sections.map(s => s.id));
  if (sectionIds.size !== sections.length || sections.some(s => !s.id || (s.beforeRowId !== null && !ids.has(s.beforeRowId))) || rows.some(r => r.sectionId !== null && !sectionIds.has(r.sectionId))) throw new Error('セクションの参照が不正です。');
  const s = record(p.settings), loop = record(s.loop);
  if (typeof s.playbackRate !== 'number' || s.playbackRate < 0.5 || s.playbackRate > 1.5 || !Number.isFinite(s.playbackRate)) throw new Error('再生速度が不正です。');
  const settings: Settings = {
    mode: choice(s.mode, ['simple', 'detail']), timingMode: choice(s.timingMode, ['continuous', 'individual']), endTarget: choice(s.endTarget, ['active', 'selected']),
    tapOffsetMs: integer(s.tapOffsetMs, -10000, 10000), wOffsetMs: integer(s.wOffsetMs, -10000, 10000), tapAssist: bool(s.tapAssist),
    playbackRate: s.playbackRate, waveformZoom: integer(s.waveformZoom, 1, 16), outputName: string(s.outputName, 500), bom: bool(s.bom),
    loop: { enabled: bool(loop.enabled), startMs: integer(loop.startMs), endMs: integer(loop.endMs) },
  };
  if (settings.loop.enabled && settings.loop.endMs <= settings.loop.startMs) throw new Error('ループの終了位置が不正です。');
  const selectedId = nullableId(p.selectedId), activeId = nullableId(p.activeId);
  if (!Array.isArray(p.selectedIds)) throw new Error('選択行情報が不正です。');
  const selectedIds = p.selectedIds.map(v => string(v, 200));
  if ([selectedId, activeId, ...selectedIds].some(id => id !== null && !ids.has(id))) throw new Error('存在しない字幕行が選択されています。');
  return { schemaVersion: 1, name: string(p.name, 500), rows, lyrics: string(p.lyrics, 5000000), sections, settings, selectedId, activeId, selectedIds,
    audioFilename: p.audioFilename === null ? null : string(p.audioFilename, 1000), playbackPositionMs: integer(p.playbackPositionMs), savedAt: date(p.savedAt) };
}
export function writeProject(project: Project, positionMs: number): string {
  const saved = { ...project, playbackPositionMs: Math.max(0, Math.round(positionMs)), savedAt: new Date().toISOString() };
  const json = JSON.stringify(saved, null, 2);
  parseProject(json); // Saved files meet the same contract as imported files.
  return json;
}
