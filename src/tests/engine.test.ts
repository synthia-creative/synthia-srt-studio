import { describe, expect, it } from 'vitest';
import { SubtitleEngine } from '../core/engine';
import { newProject, newRow } from '../core/types';
import { milliseconds } from '../core/time';
import { resolveShortcut, type ShortcutEvent } from '../core/shortcuts';
import { loopPosition } from '../media/player';
import { SuggestionReview, SuggestionStore } from '../providers/suggestions';
const create = (text = '一行\n二行\n三行') => { const engine = new SubtitleEngine(); engine.generate(text); return engine; };
const rows = (engine: SubtitleEngine) => engine.getSnapshot().project.rows;
describe('canonical timing engine', () => {
  it('R captures integer milliseconds, advances, closes previous and E ends the final row', () => {
    const e = create(); e.start(milliseconds(1.2344)); e.start(2500); e.start(3600); e.end(4500);
    expect(rows(e).map(r => [r.startMs, r.endMs])).toEqual([[1234, 2500], [2500, 3600], [3600, 4500]]);
    expect(e.getSnapshot().project.activeId).toBeNull();
  });
  it('individual mode only finalizes a row with E', () => {
    const e = create(); e.settings({ timingMode: 'individual' }); e.start(1000); e.start(2000);
    expect(rows(e)[0].endMs).toBeNull(); e.end(3000); expect(rows(e)[1].endMs).toBe(3000);
  });
  it('keeps existing end on start re-edit and atomically rejects an inverted time', () => {
    const e = create(); const id = rows(e)[0].id; e.edit(id, { startMs: 1000, endMs: 5000 }); e.select(id); e.start(2000);
    expect(rows(e)[0].endMs).toBe(5000); e.select(id); const snapshot = e.getSnapshot();
    expect(() => e.start(6000)).toThrow(); expect(e.getSnapshot()).toBe(snapshot);
  });
  it('Shift+R sets only current start and previous end, preserves current end, advances and clears active', () => {
    const e = create(); e.start(1000); const id = rows(e)[1].id; e.edit(id, { startMs: 2500, endMs: 4000 }); e.select(id); e.start(2000, true);
    expect(rows(e).map(r => [r.startMs, r.endMs])).toEqual([[1000, 2000], [2000, 4000], [null, null]]);
    expect(e.getSnapshot().project.activeId).toBeNull(); expect(e.getSnapshot().project.selectedId).toBe(rows(e)[2].id);
  });
  it('Shift+E temporarily inverts both possible E target modes', () => {
    const e = create(); e.start(1000); e.end(3000, true); expect(rows(e)[1].endMs).toBe(3000); expect(rows(e)[0].endMs).toBeNull();
    const f = create(); f.start(1000); f.settings({ endTarget: 'selected' }); f.end(2000, true); expect(rows(f)[0].endMs).toBe(2000); expect(rows(f)[1].endMs).toBeNull();
  });
  it('uses additive tap/W offsets and clamps to audio bounds', () => {
    const e = create(); e.settings({ tapOffsetMs: -50, wOffsetMs: -100 }); e.start(1234, false, true, 10000);
    expect(rows(e)[0].startMs).toBe(1084); e.settings({ timingMode: 'individual' }); e.select(rows(e)[1].id); e.start(10, false, true); expect(rows(e)[1].startMs).toBe(0);
  });
  it('retapping the same final line does not create a zero-length end', () => {
    const e = create('最後'); e.start(1000); e.start(2000); expect(rows(e)[0].endMs).toBeNull(); e.end(3000); expect(rows(e)[0].endMs).toBe(3000);
  });
  it('manual edits, nudges, bulk shifts preserve duration and silence', () => {
    const e = create(); const [a, b] = rows(e); e.edit(a.id, { startMs: 100, endMs: 1100 }); e.edit(b.id, { startMs: 3100, endMs: 4100 });
    e.nudge(a.id, 'startMs', 10); expect(rows(e)[0].startMs).toBe(110);
    e.shift([a.id, b.id], -500); expect(rows(e).slice(0, 2).map(r => [r.startMs, r.endMs])).toEqual([[0, 990], [2990, 3990]]);
  });
  it('boundary alignment is explicit and leaves unrelated gaps unchanged', () => {
    const e = create(); const [a, b, c] = rows(e); e.edit(a.id, { startMs: 0, endMs: 1000 }); e.edit(b.id, { startMs: 2000, endMs: 3000 }); e.edit(c.id, { startMs: 5000, endMs: 6000 });
    e.align(b.id, 'previous'); expect(rows(e)[0].endMs).toBe(2000); expect(rows(e)[2].startMs).toBe(5000);
    e.align(b.id, 'next'); expect(rows(e)[2].startMs).toBe(3000);
  });
  it('undo/redo restores compound operations and redo branch is cleared by a new edit', () => {
    const e = create(); e.start(1000); e.start(2000); e.undo(); expect(rows(e)[0].endMs).toBeNull(); expect(rows(e)[1].startMs).toBeNull();
    e.redo(); expect(rows(e)[0].endMs).toBe(2000); e.undo(); e.edit(rows(e)[0].id, { text: '修正' }); expect(e.getSnapshot().redoCount).toBe(0);
  });
  it('locks prevent edits, shifts, deletion, retiming and clear without partial mutations', () => {
    const e = create(); const id = rows(e)[0].id; e.flags(id, { locked: true });
    for (const action of [() => e.edit(id, { text: 'NG' }), () => e.shift([id], 100), () => e.remove([id]), () => e.start(1000), () => e.clear([id], 'both')]) {
      const before = e.getSnapshot(); expect(action).toThrow(); expect(e.getSnapshot()).toBe(before);
    }
  });
  it('retains permanent IDs through reorder, addition, deletion and Undo', () => {
    const e = create('[Verse]\na\nb'); const [a, b] = rows(e); e.move(b.id, -1); expect(rows(e)[0].id).toBe(b.id);
    e.add(b.id); const added = e.getSnapshot().project.selectedId; e.remove([added!]); expect(rows(e).map(r => r.id)).toEqual([b.id, a.id]); e.undo(); expect(rows(e)[1].id).toBe(added);
    expect(e.getSnapshot().project.sections[0].beforeRowId).toBe(b.id);
  });
  it('preserves current contents when invalid format is rejected before replace', () => {
    const e = create(); const before = e.getSnapshot(); expect(() => JSON.parse('{bad')).toThrow(); expect(e.getSnapshot()).toBe(before);
  });
});
describe('shortcut safeguards', () => {
  const event = (values: Partial<ShortcutEvent>): ShortcutEvent => ({ key: 'r', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, repeat: false, isComposing: false, ...values });
  it.each([{ repeat: true }, { isComposing: true }, { keyCode: 229 }, { altKey: true }])('ignores guarded input %j', guard => expect(resolveShortcut(event(guard), false)).toBeNull());
  it('ignores inputs/modal context, routes undo/redo and allows Shift actions', () => {
    expect(resolveShortcut(event({}), true)).toBeNull(); expect(resolveShortcut(event({ key: 'z', ctrlKey: true }), false)).toBe('undo');
    expect(resolveShortcut(event({ key: 'z', ctrlKey: true, shiftKey: true }), false)).toBe('redo'); expect(resolveShortcut(event({ key: 'y', ctrlKey: true }), false)).toBe('redo');
    expect(resolveShortcut(event({ key: 'ArrowLeft', shiftKey: true }), false)).toBe('nudgeLeft'); expect(resolveShortcut(event({ key: 'r', ctrlKey: true }), false)).toBeNull();
  });
});
describe('loop boundaries', () => {
  it('wraps at end or before start, clamps to duration and ignores invalid loops', () => {
    expect(loopPosition(3000, { enabled: true, startMs: 1000, endMs: 3000 }, 5000)).toBe(1000);
    expect(loopPosition(500, { enabled: true, startMs: 1000, endMs: 3000 }, 5000)).toBe(1000);
    expect(loopPosition(2500, { enabled: true, startMs: 1000, endMs: 3000 }, 5000)).toBe(2500);
    expect(loopPosition(4999, { enabled: true, startMs: 1000, endMs: 9000 }, 4999)).toBe(1000);
    expect(loopPosition(3000, { enabled: true, startMs: 6000, endMs: 9000 }, 5000)).toBe(3000);
  });
});
describe('future suggestion interfaces (no model or networking)', () => {
  it('isolates candidates, protects confirmed/locked rows and makes approval one undo step', () => {
    const project = newProject(); project.rows = [{ ...newRow('歌'), startMs: 1000, endMs: 2000, locked: true, confirmed: true }]; project.selectedId = project.rows[0].id;
    const engine = new SubtitleEngine(project), store = new SuggestionStore(), review = new SuggestionReview(engine, store);
    store.put({ id: 'candidate', rowId: project.rows[0].id, startMs: 1200, endMs: 2200, confidence: 0.8, method: 'future-test', createdAt: new Date().toISOString(), status: 'pending' }, project);
    expect(rows(engine)[0].startMs).toBe(1000); expect(() => review.accept('candidate')).toThrow(); review.accept('candidate', true);
    expect(rows(engine)[0].startMs).toBe(1200); expect(rows(engine)[0].locked).toBe(true); engine.undo(); expect(rows(engine)[0]).toEqual(project.rows[0]);
    review.reject('candidate'); expect(store.get('candidate')!.status).toBe('rejected');
  });
});
