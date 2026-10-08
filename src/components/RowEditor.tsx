import { useEffect, useState } from 'react';
import type { SubtitleRow } from '../core/types';
import type { SubtitleEngine } from '../core/engine';
import { formatTime, parseTime } from '../core/time';
export function RowEditor({ row, number, engine, detail, run }: {
  row: SubtitleRow; number: number; engine: SubtitleEngine; detail: boolean; run: (operation: () => void, message?: string) => void;
}) {
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [text, setText] = useState('');
  useEffect(() => { setStart(formatTime(row.startMs)); setEnd(formatTime(row.endMs)); setText(row.text); }, [row.id, row.startMs, row.endMs, row.text]);
  const dirty = start !== formatTime(row.startMs) || end !== formatTime(row.endMs) || text !== row.text;
  return <section className="row-editor" aria-label="選択行の編集">
    <div className="editor-heading"><h3>{number}行目を編集 {dirty && <span className="warning-text">・未反映</span>}</h3><div className="flag-controls">
      <label><input type="checkbox" checked={row.confirmed} onChange={e => run(() => engine.flags(row.id, { confirmed: e.target.checked }))} />手動確認済み</label>
      <label><input type="checkbox" checked={row.locked} onChange={e => run(() => engine.flags(row.id, { locked: e.target.checked }))} />ロック</label>
    </div></div>
    <div className="editor-fields">
      <label>開始時刻<input aria-label="開始時刻" value={start} disabled={row.locked} onChange={e => setStart(e.target.value)} placeholder="00:00:00,000" /></label>
      <label>終了時刻<input aria-label="終了時刻" value={end} disabled={row.locked} onChange={e => setEnd(e.target.value)} placeholder="00:00:00,000" /></label>
      <label className="editor-lyric">歌詞<textarea aria-label="選択行の歌詞" value={text} maxLength={1000000} disabled={row.locked} onChange={e => setText(e.target.value)} rows={2} /></label>
      <button className="primary" disabled={row.locked} onClick={() => run(() => engine.edit(row.id, { text, startMs: parseTime(start), endMs: parseTime(end) }), '選択行を反映しました。')}>変更を反映</button>
    </div>
    {detail && <><div className="nudge-controls">{(['startMs', 'endMs'] as const).map(field => <div key={field}><span>{field === 'startMs' ? '開始' : '終了'}の微調整</span>{[-1000, -100, -10, 10, 100, 1000].map(delta => <button key={delta} disabled={row.locked || row[field] === null} onClick={() => run(() => engine.nudge(row.id, field, delta))}>{delta > 0 ? '+' : '−'}{Math.abs(delta) === 1000 ? '1秒' : `${Math.abs(delta)}ms`}</button>)}</div>)}</div>
    <div className="inline-actions"><button disabled={row.locked} onClick={() => run(() => engine.align(row.id, 'previous'))}>前行の終了を合わせる</button><button disabled={row.locked} onClick={() => run(() => engine.align(row.id, 'next'))}>次行の開始を合わせる</button>
      <button disabled={row.locked} onClick={() => run(() => engine.clear([row.id], 'startMs'))}>開始をクリア</button><button disabled={row.locked} onClick={() => run(() => engine.clear([row.id], 'endMs'))}>終了をクリア</button><button disabled={row.locked} onClick={() => run(() => engine.clear([row.id], 'both'))}>両時刻をクリア</button>
    </div></>}
  </section>;
}
