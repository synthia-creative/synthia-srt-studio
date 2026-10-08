export type RowSource = 'manual' | 'imported' | 'suggested';
export interface SubtitleRow {
  id: string;
  text: string;
  startMs: number | null;
  endMs: number | null;
  source: RowSource;
  editState: 'draft' | 'edited' | 'reviewed';
  confirmed: boolean;
  locked: boolean;
  updatedAt: string;
  sectionId: string | null;
}
export interface Section { id: string; label: string; sourceLine: number; beforeRowId: string | null }
export interface Settings {
  mode: 'simple' | 'detail';
  timingMode: 'continuous' | 'individual';
  endTarget: 'active' | 'selected';
  tapOffsetMs: number;
  wOffsetMs: number;
  tapAssist: boolean;
  playbackRate: number;
  waveformZoom: number;
  loop: { enabled: boolean; startMs: number; endMs: number };
  outputName: string;
  bom: boolean;
}
export interface Project {
  schemaVersion: 1;
  name: string;
  rows: SubtitleRow[];
  lyrics: string;
  sections: Section[];
  settings: Settings;
  selectedId: string | null;
  selectedIds: string[];
  activeId: string | null;
  audioFilename: string | null;
  playbackPositionMs: number;
  savedAt: string;
}
export interface ValidationIssue { rowId: string; rowNumber: number; severity: 'error' | 'warning'; message: string }
export const newRow = (text = '', source: RowSource = 'manual'): SubtitleRow => ({
  id: crypto.randomUUID(), text, startMs: null, endMs: null, source,
  editState: 'draft', confirmed: false, locked: false, updatedAt: new Date().toISOString(), sectionId: null,
});
export const defaultSettings = (): Settings => ({
  mode: 'simple', timingMode: 'continuous', endTarget: 'active', tapOffsetMs: 0, wOffsetMs: -100,
  tapAssist: false, playbackRate: 1, waveformZoom: 1,
  loop: { enabled: false, startMs: 0, endMs: 0 }, outputName: 'subtitles.srt', bom: false,
});
export const newProject = (): Project => ({
  schemaVersion: 1, name: '無題のプロジェクト', rows: [], lyrics: '', sections: [], settings: defaultSettings(),
  selectedId: null, selectedIds: [], activeId: null, audioFilename: null, playbackPositionMs: 0,
  savedAt: new Date().toISOString(),
});
