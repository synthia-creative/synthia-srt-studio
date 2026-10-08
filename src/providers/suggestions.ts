import type { Project } from '../core/types';
import type { SubtitleEngine } from '../core/engine';
export interface TimingSuggestion {
  id: string; rowId: string; startMs: number; endMs: number; confidence: number;
  method: string; createdAt: string; status: 'pending' | 'accepted' | 'rejected';
}
export interface SuggestionRequest { audio: Blob; lyrics: string; rows: ReadonlyArray<{ id: string; text: string }>; signal: AbortSignal }
export interface TimingSuggestionProvider {
  readonly id: string;
  readonly execution: 'local' | 'external';
  suggest(request: SuggestionRequest, consent?: { grantedAt: string; destination: string }): Promise<TimingSuggestion[]>;
}
export class SuggestionStore {
  private suggestions = new Map<string, TimingSuggestion>();
  put(candidate: TimingSuggestion, project: Project) {
    if (!project.rows.some(row => row.id === candidate.rowId) || !Number.isSafeInteger(candidate.startMs) || !Number.isSafeInteger(candidate.endMs) || candidate.startMs < 0 || candidate.endMs <= candidate.startMs || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1 || !Number.isFinite(Date.parse(candidate.createdAt))) throw new Error('候補データが不正です。');
    this.suggestions.set(candidate.id, structuredClone(candidate));
  }
  get(id: string) { const value = this.suggestions.get(id); return value ? structuredClone(value) : undefined; }
  list(rowId?: string) { return [...this.suggestions.values()].filter(s => !rowId || s.rowId === rowId).map(s => structuredClone(s)); }
  setStatus(id: string, status: TimingSuggestion['status']) { const value = this.suggestions.get(id); if (value) value.status = status; }
}
export class SuggestionReview {
  constructor(private engine: SubtitleEngine, private store: SuggestionStore) {}
  compare(id: string) {
    const candidate = this.store.get(id); if (!candidate) throw new Error('候補が見つかりません。');
    const current = this.engine.getSnapshot().project.rows.find(r => r.id === candidate.rowId);
    if (!current) throw new Error('字幕行が見つかりません。');
    return { current: structuredClone(current), candidate };
  }
  accept(id: string, explicitApproval = false) {
    const { current, candidate } = this.compare(id);
    if ((current.locked || current.confirmed) && !explicitApproval) throw new Error('手動確認済み・ロック行の変更には明示的な承認が必要です。');
    // One transaction/snapshot: Undo restores original times, source, and lock state together.
    const project = structuredClone(this.engine.getSnapshot().project);
    const row = project.rows.find(r => r.id === current.id)!;
    row.startMs = candidate.startMs; row.endMs = candidate.endMs; row.source = 'suggested';
    row.confirmed = false; row.editState = 'edited'; row.updatedAt = new Date().toISOString();
    this.engine.replace(project); this.store.setStatus(id, 'accepted');
  }
  reject(id: string) { this.compare(id); this.store.setStatus(id, 'rejected'); }
}
