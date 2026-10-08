import { newProject, newRow, type Project, type Settings, type SubtitleRow } from './types';
import { parseLyrics } from '../formats/lyrics';

export interface EngineSnapshot { project: Project; undoCount: number; redoCount: number; revision: number }
type Listener = () => void;
const clone = <T,>(value: T): T => structuredClone(value);
export class SubtitleEngine {
  private past: Project[] = [];
  private future: Project[] = [];
  private listeners = new Set<Listener>();
  private snapshot: EngineSnapshot;
  constructor(project = newProject()) { this.snapshot = { project: clone(project), undoCount: 0, redoCount: 0, revision: 0 }; }
  getSnapshot = (): EngineSnapshot => this.snapshot;
  subscribe = (fn: Listener) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(project: Project) {
    this.snapshot = { project, undoCount: this.past.length, redoCount: this.future.length, revision: this.snapshot.revision + 1 };
    this.listeners.forEach(fn => fn());
  }
  private commit(operation: (draft: Project) => void, history = true) {
    const previous = this.snapshot.project;
    const draft = clone(previous);
    operation(draft); // Throw before publishing/history: failed operations remain atomic.
    if (JSON.stringify(draft) === JSON.stringify(previous)) return;
    if (history) { this.past.push(previous); if (this.past.length > 100) this.past.shift(); this.future = []; }
    this.publish(draft);
  }
  private row(project: Project, id: string): SubtitleRow {
    const row = project.rows.find(row => row.id === id);
    if (!row) throw new Error('字幕行が見つかりません。');
    return row;
  }
  private editable(row: SubtitleRow) { if (row.locked) throw new Error('ロックを解除してから編集してください。'); }
  private touch(row: SubtitleRow) { row.updatedAt = new Date().toISOString(); row.editState = row.confirmed ? 'reviewed' : 'edited'; }
  private validTimes(row: SubtitleRow) {
    for (const ms of [row.startMs, row.endMs]) if (ms !== null && (!Number.isSafeInteger(ms) || ms < 0)) throw new Error('時刻は0以上の整数ミリ秒が必要です。');
    if (row.startMs !== null && row.endMs !== null && row.startMs >= row.endMs) throw new Error('開始時刻は終了時刻より前に設定してください。既存の終了時刻は保持されます。');
  }
  replace(project: Project) { this.commit(draft => Object.assign(draft, clone(project))); }
  reset() { this.replace(newProject()); }
  undo() { const previous = this.past.pop(); if (previous) { this.future.push(this.snapshot.project); this.publish(previous); } }
  redo() { const next = this.future.pop(); if (next) { this.past.push(this.snapshot.project); this.publish(next); } }
  select(id: string | null) { this.commit(p => { if (id) this.row(p, id); p.selectedId = id; }, false); }
  selectRelative(delta: number) {
    const p = this.snapshot.project, index = p.rows.findIndex(row => row.id === p.selectedId);
    this.select(p.rows[Math.max(0, Math.min(p.rows.length - 1, index + delta))]?.id ?? null);
  }
  selectMany(ids: string[]) { this.commit(p => { p.selectedIds = ids.filter(id => p.rows.some(row => row.id === id)); }, false); }
  metadata(values: Partial<Pick<Project, 'name' | 'lyrics' | 'audioFilename' | 'playbackPositionMs'>>) {
    this.commit(p => Object.assign(p, values), false);
  }
  settings(values: Partial<Settings>) { this.commit(p => { p.settings = { ...p.settings, ...values }; }, false); }
  generate(raw: string) {
    const parsed = parseLyrics(raw);
    if (!parsed.rows.length) throw new Error('歌詞を入力してください。');
    if (parsed.rows.length > 20000 || raw.length > 5000000) throw new Error('歌詞は2万行・500万文字以内で入力してください。');
    this.commit(p => { p.lyrics = raw; p.rows = parsed.rows; p.sections = parsed.sections; p.selectedId = p.rows[0].id; p.selectedIds = []; p.activeId = null; });
  }
  importRows(rows: SubtitleRow[], outputName: string) {
    this.commit(p => { p.rows = clone(rows); p.sections = []; p.lyrics = rows.map(r => r.text).join('\n'); p.selectedId = rows[0]?.id ?? null; p.selectedIds = []; p.activeId = null; p.settings.outputName = outputName; p.settings.endTarget = 'selected'; });
  }
  edit(id: string, values: Partial<Pick<SubtitleRow, 'text' | 'startMs' | 'endMs'>>) {
    this.commit(p => { const row = this.row(p, id); this.editable(row); if (values.text && values.text.length > 1000000) throw new Error('1行の歌詞は100万文字以内で入力してください。'); Object.assign(row, values); this.validTimes(row); this.touch(row); });
  }
  flags(id: string, values: Partial<Pick<SubtitleRow, 'confirmed' | 'locked'>>) {
    this.commit(p => { const row = this.row(p, id); Object.assign(row, values); this.touch(row); });
  }
  // Shortcut semantics adapted from cityedge/SRT Tap Timer v1.64.2 (MIT).
  // Unlike upstream, reject inverted intervals instead of silently clearing an existing end.
  start(capturedMs: number, forcePreviousEnd = false, wCorrection = false, durationMs?: number) {
    this.commit(p => {
      if (!p.selectedId) throw new Error('先に字幕行を生成してください。');
      const ms = Math.max(0, Math.min(durationMs ?? Infinity, Math.round(capturedMs + p.settings.tapOffsetMs + (wCorrection ? p.settings.wOffsetMs : 0))));
      const index = p.rows.findIndex(r => r.id === p.selectedId), row = p.rows[index];
      this.editable(row); row.startMs = ms; this.validTimes(row); this.touch(row);
      if (forcePreviousEnd) {
        const previous = p.rows[index - 1];
        if (previous) { this.editable(previous); previous.endMs = ms; this.validTimes(previous); this.touch(previous); }
        p.activeId = null;
      } else {
        if (p.settings.timingMode === 'continuous' && p.activeId && p.activeId !== row.id) {
          const active = this.row(p, p.activeId);
          if (active.endMs === null) { this.editable(active); active.endMs = ms; this.validTimes(active); this.touch(active); }
        }
        p.activeId = row.id;
      }
      p.selectedId = p.rows[Math.min(index + 1, p.rows.length - 1)].id;
    });
  }
  end(capturedMs: number, invertTarget = false, durationMs?: number) {
    this.commit(p => {
      const selected = (p.settings.endTarget === 'selected') !== invertTarget;
      const id = selected ? p.selectedId : p.activeId;
      if (!id) throw new Error('終了対象がありません。先にRで開始を入力してください。');
      const row = this.row(p, id); this.editable(row);
      row.endMs = Math.max(0, Math.min(durationMs ?? Infinity, Math.round(capturedMs + p.settings.tapOffsetMs)));
      this.validTimes(row); this.touch(row);
      if (p.activeId === id) p.activeId = null;
      if (selected) p.selectedId = p.rows[Math.min(p.rows.findIndex(r => r.id === id) + 1, p.rows.length - 1)].id;
    });
  }
  nudge(id: string, field: 'startMs' | 'endMs', delta: number) {
    const value = this.row(this.snapshot.project, id)[field];
    if (value === null) throw new Error('先に時刻を設定してください。');
    this.edit(id, { [field]: value + delta });
  }
  shift(ids: string[], delta: number) {
    if (!ids.length) throw new Error('シフトする行にチェックを付けてください。');
    if (!Number.isSafeInteger(delta)) throw new Error('シフト量は整数ミリ秒で入力してください。');
    this.commit(p => {
      const rows = ids.map(id => this.row(p, id)); rows.forEach(row => this.editable(row));
      const values = rows.flatMap(row => [row.startMs, row.endMs]).filter((v): v is number => v !== null);
      if (!values.length) throw new Error('選択行に時刻がありません。');
      const applied = Math.max(delta, -Math.min(...values));
      rows.forEach(row => { if (row.startMs !== null) row.startMs += applied; if (row.endMs !== null) row.endMs += applied; this.validTimes(row); this.touch(row); });
    });
  }
  align(id: string, side: 'previous' | 'next') {
    this.commit(p => {
      const index = p.rows.findIndex(row => row.id === id), row = this.row(p, id);
      const target = p.rows[index + (side === 'previous' ? -1 : 1)];
      if (!target) throw new Error('境界を合わせる隣の行がありません。');
      const value = side === 'previous' ? row.startMs : row.endMs;
      if (value === null) throw new Error('境界の基準時刻が未設定です。');
      this.editable(target);
      if (side === 'previous') target.endMs = value; else target.startMs = value;
      this.validTimes(target); this.touch(target);
    });
  }
  clear(ids: string[], field: 'startMs' | 'endMs' | 'both') {
    this.commit(p => ids.forEach(id => { const row = this.row(p, id); this.editable(row); if (field !== 'endMs') row.startMs = null; if (field !== 'startMs') row.endMs = null; this.touch(row); if (p.activeId === id) p.activeId = null; }));
  }
  add(afterId: string | null) {
    this.commit(p => { const row = newRow(); const index = p.rows.findIndex(r => r.id === afterId); p.rows.splice(index + 1, 0, row); p.selectedId = row.id; });
  }
  remove(ids: string[]) {
    this.commit(p => {
      ids.forEach(id => this.editable(this.row(p, id)));
      const index = p.rows.findIndex(row => row.id === p.selectedId);
      p.rows = p.rows.filter(row => !ids.includes(row.id)); p.selectedIds = p.selectedIds.filter(id => !ids.includes(id));
      if (p.activeId && ids.includes(p.activeId)) p.activeId = null;
      if (p.selectedId && ids.includes(p.selectedId)) p.selectedId = p.rows[Math.min(index, p.rows.length - 1)]?.id ?? null;
      this.repairSections(p);
    });
  }
  move(id: string, delta: -1 | 1) {
    this.commit(p => { const row = this.row(p, id); this.editable(row); const index = p.rows.findIndex(r => r.id === id), target = index + delta; if (target < 0 || target >= p.rows.length) return; p.rows.splice(index, 1); p.rows.splice(target, 0, row); this.touch(row); this.repairSections(p); });
  }
  private repairSections(p: Project) { p.sections.forEach(s => { s.beforeRowId = p.rows.find(r => r.sectionId === s.id)?.id ?? null; }); }
}
