import { memo } from 'react';
import type { Project, ValidationIssue } from '../core/types';
import { formatTime } from '../core/time';
import type { SubtitleEngine } from '../core/engine';
export const SubtitleTable = memo(function SubtitleTable({ project, engine, issues, onSelect }: {
  project: Project; engine: SubtitleEngine; issues: ValidationIssue[]; onSelect: (id: string, seek: boolean) => void;
}) {
  const issueMap = new Map<string, string[]>();
  for (const issue of issues) issueMap.set(issue.rowId, [...(issueMap.get(issue.rowId) ?? []), issue.message]);
  const sections = new Map(project.sections.map(section => [section.id, section.label]));
  let previousSection: string | null = null;
  return <div className="table-scroll"><table>
    <thead><tr><th><input type="checkbox" aria-label="全行を選択" checked={!!project.rows.length && project.selectedIds.length === project.rows.length} onChange={event => engine.selectMany(event.target.checked ? project.rows.map(row => row.id) : [])} /></th><th>行</th><th>開始</th><th>終了</th><th className="lyric-column">歌詞</th><th>状態</th></tr></thead>
    <tbody>{project.rows.map((row, index) => {
      const newSection = row.sectionId !== previousSection; previousSection = row.sectionId;
      return <tr key={row.id} data-row-id={row.id} data-testid={`subtitle-row-${index + 1}`} className={[project.selectedId === row.id ? 'selected-row' : '', project.activeId === row.id ? 'timing-row' : '', issueMap.has(row.id) ? 'has-issue' : ''].join(' ')}>
        <td><input type="checkbox" aria-label={`${index + 1}行目を選択`} checked={project.selectedIds.includes(row.id)} onChange={event => engine.selectMany(event.target.checked ? [...project.selectedIds, row.id] : project.selectedIds.filter(id => id !== row.id))} /></td>
        <td className="row-number"><button onClick={() => onSelect(row.id, true)} aria-label={`${index + 1}行目へ移動`}>{String(index + 1).padStart(2, '0')}</button></td>
        <td><button className="timestamp" aria-label={`${index + 1}行目の開始を編集`} onClick={() => onSelect(row.id, false)}>{formatTime(row.startMs) || '未設定'}</button></td>
        <td><button className="timestamp" aria-label={`${index + 1}行目の終了を編集`} onClick={() => onSelect(row.id, false)}>{formatTime(row.endMs) || '未設定'}</button></td>
        <td className="lyric-column"><button className="lyric-cell" onClick={() => onSelect(row.id, true)}>
          {newSection && row.sectionId && <span className="section-label">{sections.get(row.sectionId)}</span>}
          <span>{row.text || '歌詞を入力'}</span>
        </button>{issueMap.get(row.id) && <span className="row-issue">{issueMap.get(row.id)!.join(' ')}</span>}</td>
        <td className="state-cell"><span title={row.source === 'imported' ? 'SRTから読み込み' : '手動編集'}>{row.locked ? 'ロック' : row.confirmed ? '確認済' : row.startMs === null || row.endMs === null ? '下書き' : '編集済'}</span>{project.activeId === row.id && <span className="live-state">入力中</span>}</td>
      </tr>;
    })}</tbody>
  </table>{!project.rows.length && <div className="empty-state"><span className="empty-mark">R / E</span><h3>歌詞に、時間を。</h3><p>歌詞を貼り付けて「字幕行を生成」を押してください。<br />音源を聴きながら、Rで開始、Eで終了を入力できます。</p></div>}</div>;
});
