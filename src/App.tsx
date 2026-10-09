import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SubtitleEngine } from './core/engine';
import type { Project } from './core/types';
import { formatTime, parseTime } from './core/time';
import { validateRows } from './core/validation';
import { isInputTarget, resolveShortcut } from './core/shortcuts';
import { parseSrt, writeSrt } from './formats/srt';
import { parseProject, writeProject } from './formats/project';
import { downloadText, readText, safeFilename } from './formats/files';
import { loadDraft, saveDraft } from './storage/draft';
import { usePlayer } from './media/player';
import { Modal } from './components/Modal';
import { Waveform } from './components/Waveform';
import { SubtitleTable } from './components/SubtitleTable';
import { RowEditor } from './components/RowEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpPanel, type HelpTopic } from './components/HelpPanel';
import { GuidedTour } from './components/GuidedTour';
import { Tooltips } from './components/Tooltips';
import { hint } from './help/hints';
import content from './help/content.json';
import { hasSeenGuide, rememberGuide } from './help/onboarding';

export function App() {
  const [engine] = useState(() => new SubtitleEngine());
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot), p = snapshot.project;
  const [message, setMessage] = useState('歌詞と音源を読み込んで、制作を始めましょう。');
  const [settingsOpen, setSettingsOpen] = useState(false), [helpOpen, setHelpOpen] = useState(false), [exportOpen, setExportOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopic>('first'), [guideStep, setGuideStep] = useState<number | null>(null);
  const guideSeen = useRef(hasSeenGuide()), guidePreviousPanel = useRef<'lyrics' | 'subtitles'>('lyrics');
  const [confirmation, setConfirmation] = useState<{ title: string; text: string; action: () => void; label: string } | null>(null);
  const [draft, setDraft] = useState<Project | null>(null), [storageReady, setStorageReady] = useState(false), [saveStatus, setSaveStatus] = useState('下書きを確認中');
  const [mobilePanel, setMobilePanel] = useState<'lyrics' | 'subtitles'>('lyrics'), [shift, setShift] = useState(100);
  const player = usePlayer(p.settings, setMessage), detail = p.settings.mode === 'detail';
  const positionRef = useRef(player.positionMs); positionRef.current = player.loaded ? player.positionMs : p.playbackPositionMs;
  const issues = useMemo(() => validateRows(p.rows), [p.rows]);
  const errors = issues.filter(issue => issue.severity === 'error'), warnings = issues.filter(issue => issue.severity === 'warning');
  const current = p.rows.find(row => row.id === p.selectedId), number = p.rows.findIndex(row => row.id === p.selectedId) + 1;
  const run = useCallback((operation: () => void, success?: string) => { try { operation(); if (success) setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : '操作に失敗しました。'); } }, []);
  const stamp = useCallback((type: 'start' | 'end', force = false, corrected = false) => {
    const captured = player.capture(); // Read media time FIRST, before cloning/history/React updates.
    if (!player.loaded) { setMessage('先に音源ファイルを読み込んでください。'); return; }
    run(() => type === 'start' ? engine.start(captured, force, corrected, player.durationMs) : engine.end(captured, force, player.durationMs), `${type === 'start' ? '開始' : '終了'}時刻を入力しました。`);
  }, [player.capture, player.loaded, player.durationMs, run, engine]);
  const onSelect = useCallback((id: string, seek: boolean) => {
    engine.select(id); if (seek) { const time = engine.getSnapshot().project.rows.find(row => row.id === id)?.startMs; if (time !== null && time !== undefined) player.seek(time); }
  }, [engine, player.seek]);
  const hasModal = settingsOpen || helpOpen || exportOpen || !!confirmation || !!draft || guideStep !== null;
  const openHelp = (topic: HelpTopic = 'first') => { setHelpTopic(topic); setHelpOpen(true); };
  const startGuide = () => { guidePreviousPanel.current = mobilePanel; setHelpOpen(false); setGuideStep(0); setMobilePanel('lyrics'); };
  const closeGuide = () => { guideSeen.current = true; rememberGuide(); setGuideStep(null); setMobilePanel(guidePreviousPanel.current); setMessage('案内を終了しました。「使い方」からいつでも再表示できます。'); };
  const changeGuideStep = (step: number) => { setGuideStep(step); setMobilePanel(content.guideSteps[step].panel as 'lyrics' | 'subtitles'); };
  useEffect(() => {
    if (storageReady && !hasModal && !guideSeen.current) { guidePreviousPanel.current = mobilePanel; setGuideStep(0); setMobilePanel('lyrics'); }
  }, [storageReady, hasModal, mobilePanel]);
  const composing = useRef(false);
  useEffect(() => {
    const begin = () => { composing.current = true; }, end = () => { composing.current = false; };
    window.addEventListener('compositionstart', begin); window.addEventListener('compositionend', end);
    return () => { window.removeEventListener('compositionstart', begin); window.removeEventListener('compositionend', end); };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const shortcut = resolveShortcut(event, hasModal || composing.current || isInputTarget(event.target));
      if (!shortcut) return;
      // Let focused buttons retain native Space/Enter behavior.
      if (shortcut === 'space' && event.target instanceof HTMLElement && event.target.closest('button')) return;
      event.preventDefault();
      switch (shortcut) {
        case 'start': stamp('start', event.shiftKey); break;
        case 'correctedStart': stamp('start', event.shiftKey, true); break;
        case 'end': stamp('end', event.shiftKey); break;
        case 'space': if (engine.getSnapshot().project.settings.tapAssist) stamp('start'); else void player.toggle(); break;
        case 'undo': engine.undo(); break; case 'redo': engine.redo(); break;
        case 'up': engine.selectRelative(-1); break; case 'down': engine.selectRelative(1); break;
        case 'left': player.seek(player.capture() - 2000); break; case 'right': player.seek(player.capture() + 2000); break;
        case 'nudgeLeft': case 'nudgeRight': if (p.selectedId) run(() => engine.nudge(p.selectedId!, 'startMs', shortcut === 'nudgeLeft' ? -100 : 100)); break;
      }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [hasModal, stamp, engine, p.selectedId, player.toggle, player.seek, player.capture, run]);
  useEffect(() => {
    let frame = 0;
    const reveal = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (p.selectedId) document.querySelector(`[data-row-id="${CSS.escape(p.selectedId)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }); };
    reveal(); window.addEventListener('resize', reveal);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', reveal); };
  }, [p.selectedId, p.settings.mode, mobilePanel]);
  useEffect(() => {
    let disposed = false;
    loadDraft().then(value => { if (!disposed) { setDraft(value); setStorageReady(true); setSaveStatus(value ? '保存済みの下書きがあります' : '自動保存を準備しました'); } }).catch(() => { if (!disposed) { setStorageReady(true); setSaveStatus('自動保存を利用できません。JSONで保存してください'); } });
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    if (!storageReady || draft) return;
    const timer = setTimeout(() => {
      setSaveStatus('自動保存中…');
      try { saveDraft(writeProject(engine.getSnapshot().project, positionRef.current)).then(() => setSaveStatus('下書きを自動保存しました')).catch(() => setSaveStatus('自動保存に失敗しました。JSONで保存してください')); }
      catch { setSaveStatus('データ量や設定を確認し、JSONで保存してください'); }
    }, 650);
    return () => clearTimeout(timer);
  }, [snapshot.revision, storageReady, draft, engine]);
  useEffect(() => {
    const timer = setInterval(() => { if (player.loaded && player.playing) engine.metadata({ playbackPositionMs: player.capture() }); }, 5000);
    return () => clearInterval(timer);
  }, [engine, player.capture, player.loaded, player.playing]);
  useEffect(() => {
    const flush = () => { try { if (storageReady && !draft) void saveDraft(writeProject(engine.getSnapshot().project, positionRef.current)).catch(() => {}); } catch { /* Explicit JSON save reports validation errors. */ } };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (engine.getSnapshot().project.rows.length) { flush(); event.preventDefault(); } };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', beforeUnload);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', beforeUnload); };
  }, [engine, storageReady, draft]);
  const confirmReplace = (title: string, action: () => void) => {
    if (p.rows.length || p.lyrics.trim()) setConfirmation({ title, text: '現在の字幕を置き換えます。必要なら先にプロジェクトを保存してください。置き換え後もUndoで字幕を戻せます。', action, label: '置き換える' });
    else action();
  };
  const confirmEdit = (title: string, text: string, action: () => void) => setConfirmation({ title, text: `${text} Undoで戻せます。`, action, label: '実行する' });
  const restore = (project: Project, origin: string) => {
    player.unload(); engine.replace(project); setMobilePanel('subtitles');
    setMessage(`${origin}を復元しました。${project.audioFilename ? `音源「${project.audioFilename}」を再選択してください。保存位置から再開できます。` : '音源は未選択です。音源ファイルを読み込んでください。'}`);
  };
  const fileHandler = (kind: 'lyrics' | 'srt' | 'project') => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const text = await readText(file);
      if (kind === 'lyrics') confirmReplace('歌詞を読み込む', () => { engine.metadata({ lyrics: text }); if (engine.getSnapshot().project.settings.outputName === 'subtitles.srt') engine.settings({ outputName: file.name.replace(/\.[^.]+$/, '.srt') }); setMessage('歌詞を読み込みました。「字幕行を生成」を押してください。'); });
      if (kind === 'srt') { const rows = parseSrt(text); confirmReplace('SRTを読み込む', () => { engine.importRows(rows, file.name.replace(/\.[^.]+$/, '.srt')); setMobilePanel('subtitles'); setMessage('SRTを読み込みました。Eキーの対象は現在行に設定しました。'); }); }
      if (kind === 'project') { const project = parseProject(text); confirmReplace('プロジェクトを復元する', () => restore(project, 'プロジェクトファイル')); }
    } catch (error) { setMessage(`読み込めませんでした。${error instanceof Error ? error.message : ''} 現在の編集内容は保持されています。`); }
  };
  const saveProject = () => run(() => downloadText(writeProject(p, positionRef.current), safeFilename(p.name, '.synthia-srt.json'), 'application/json;charset=utf-8'), 'プロジェクトを保存しました。音源本体は含まれていません。');
  const exportSrt = () => run(() => { downloadText(writeSrt(p.rows, p.settings.bom), safeFilename(p.settings.outputName, '.srt'), 'application/x-subrip;charset=utf-8'); setExportOpen(false); }, 'SRTを書き出しました。');
  const loopEdit = (field: 'startMs' | 'endMs', text: string) => run(() => {
    const value = parseTime(text); if (value === null) throw new Error('ループ位置を入力してください。');
    const loop = { ...p.settings.loop, [field]: value }; if (loop.endMs <= loop.startMs) loop.enabled = false;
    engine.settings({ loop });
  });
  return <div className="studio">
    <header className="app-header">
      <div className="brand"><div className="brand-symbol" aria-hidden="true"><i /><i /><i /><i /></div><div><h1>SYNTHIA <span>SRT Studio</span></h1><p>歌詞と音をつなぐ、制作ワークスペース</p></div></div>
      <div className="project-name"><label htmlFor="project-name">プロジェクト</label><input id="project-name" value={p.name} onChange={e => engine.metadata({ name: e.target.value })} maxLength={500} /></div>
      <div className="header-actions"><button {...hint('new')} onClick={() => confirmReplace('新規プロジェクト', () => { player.unload(); engine.reset(); setMessage('新規プロジェクトを作成しました。'); })}>新規</button><button {...hint('save')} onClick={saveProject}>プロジェクト保存</button>
        <label className="file-button" {...hint('restore')}>復元<input type="file" accept=".json" aria-label="プロジェクトを復元" onChange={fileHandler('project')} /></label>
        <button {...hint('help')} onClick={() => openHelp()}>使い方</button><button {...hint('settings')} onClick={() => setSettingsOpen(true)}>設定</button><button data-guide="export" {...hint('export')} className="primary" onClick={() => setExportOpen(true)}>SRT出力</button></div>
    </header>
    <div className="workspace-heading"><div className="mode-switch" aria-label="表示モード"><button {...hint('simple')} aria-pressed={!detail} onClick={() => engine.settings({ mode: 'simple' })}>シンプル</button><button {...hint('detail')} aria-pressed={detail} onClick={() => engine.settings({ mode: 'detail' })}>詳細編集</button></div><div className="session-status"><span className="status-dot" />ブラウザ内で編集<span className="save-status" role="status">{saveStatus}</span></div></div>
    <section className="audio-panel" data-guide="audio" aria-label="音源プレイヤー">
      <div className="panel-heading"><h2>音源</h2><span className="audio-name">{p.audioFilename || '音源が選択されていません'}</span><label className="file-button" {...hint('audio')}>音源を読み込む<input type="file" aria-label="音源を読み込む" accept=".mp3,.wav,audio/*" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; const position = p.audioFilename === file.name ? p.playbackPositionMs : 0; player.load(file, position); engine.metadata({ audioFilename: file.name, playbackPositionMs: position }); setMessage('音源を読み込んでいます。'); }} /></label></div>
      <audio ref={player.audioRef} preload="metadata" />
      <Waveform waveform={player.waveform} durationMs={player.durationMs} positionMs={player.positionMs} zoom={p.settings.waveformZoom} loop={p.settings.loop} onSeek={player.seek} onLoop={(startMs, endMs) => engine.settings({ loop: { enabled: true, startMs, endMs } })} status={player.waveStatus} />
      <div className="transport"><div className="transport-buttons"><button aria-label="2秒戻る" disabled={!player.loaded} onClick={() => player.seek(player.capture() - 2000)}>−2秒</button><button {...hint('play')} className="play-button" disabled={!player.loaded} onClick={() => void player.toggle()}>{player.playing ? 'Ⅱ 停止' : '▶ 再生'}</button><button aria-label="2秒進む" disabled={!player.loaded} onClick={() => player.seek(player.capture() + 2000)}>+2秒</button></div>
        <div className="play-clock"><strong data-testid="playback-time">{formatTime(player.positionMs)}</strong><span>/ {formatTime(player.durationMs)}</span></div>
        <label className="compact-field">速度<select aria-label="再生速度" value={p.settings.playbackRate} onChange={e => engine.settings({ playbackRate: Number(e.target.value) })}>{[0.5, 0.75, 1, 1.25, 1.5].map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
        <label className="compact-field zoom-control">波形拡大<select aria-label="波形拡大" value={p.settings.waveformZoom} onChange={e => engine.settings({ waveformZoom: Number(e.target.value) })}>{[1, 2, 4, 8, 16].map(zoom => <option key={zoom} value={zoom}>{zoom}×</option>)}</select></label>
        <button aria-pressed={p.settings.loop.enabled} disabled={!player.loaded} onClick={() => run(() => { if (p.settings.loop.endMs <= p.settings.loop.startMs || p.settings.loop.startMs >= player.durationMs) throw new Error('波形上で区間を選択してください。'); engine.settings({ loop: { ...p.settings.loop, enabled: !p.settings.loop.enabled } }); })}>↻ ループ</button>
      </div>
      {detail && <div className="loop-fields"><span>ループ区間</span><label>開始<input aria-label="ループ開始" key={`start-${p.settings.loop.startMs}`} defaultValue={formatTime(p.settings.loop.startMs)} onBlur={e => loopEdit('startMs', e.target.value)} /></label><label>終了<input aria-label="ループ終了" key={`end-${p.settings.loop.endMs}`} defaultValue={formatTime(p.settings.loop.endMs)} onBlur={e => loopEdit('endMs', e.target.value)} /></label><span>再生範囲は音源の長さまで</span></div>}
    </section>
    <div className="mobile-tabs" aria-label="編集パネル"><button aria-pressed={mobilePanel === 'lyrics'} onClick={() => setMobilePanel('lyrics')}>歌詞入力</button><button aria-pressed={mobilePanel === 'subtitles'} onClick={() => setMobilePanel('subtitles')}>字幕編集（{p.rows.length}）</button></div>
    <main className="editing-workspace">
      <section className={`lyrics-panel ${mobilePanel === 'lyrics' ? 'mobile-active' : ''}`} aria-label="歌詞入力">
        <div className="panel-heading"><h2>歌詞</h2><label className="file-button">TXT読込<input type="file" aria-label="TXTを読み込む" accept=".txt,text/plain" onChange={fileHandler('lyrics')} /></label></div>
        <label className="lyrics-input-label" htmlFor="lyrics-input">歌詞を貼り付け</label><textarea id="lyrics-input" value={p.lyrics} maxLength={5000000} onChange={e => engine.metadata({ lyrics: e.target.value })} placeholder={'[Verse]\nここに歌詞を貼り付けてください\n\n[Chorus]\n日本語・英語の歌詞に対応しています'} spellCheck={false} />
        <p className="field-help">[Verse]、[Chorus] などのタグは区切りとして保持し、字幕には出力しません。</p>
        <button {...hint('generate')} className="primary generate-button" onClick={() => { const action = () => run(() => { engine.generate(p.lyrics); setMobilePanel('subtitles'); }, '字幕行を生成しました。音源に合わせてRで開始を入力してください。'); if (p.rows.length) confirmReplace('字幕行を生成する', action); else action(); }}>字幕行を生成</button>
        <div className="timing-controls"><h3>タイミング入力</h3><p>Rの後は次の行を選びます。最後の歌詞はEで終了します。</p><div><button {...hint('start')} className="start-button" onClick={() => stamp('start')}><kbd>R</kbd>開始を入力</button><button {...hint(p.settings.endTarget === 'active' ? 'endActive' : 'endSelected')} onClick={() => stamp('end')}><kbd>E</kbd>終了を入力</button></div><div className="timing-context"><span>選択行 {number || '—'}</span><span>{p.activeId ? `入力中 ${p.rows.findIndex(r => r.id === p.activeId) + 1}行目` : '開始待ち'}</span></div><p className="end-target-label">Eの対象：{p.settings.endTarget === 'active' ? '直前にRで開始した行' : '現在選択している行'}</p></div>
        {p.settings.tapAssist && <button className="tap-zone" onPointerDown={e => { if (e.button === 0 && !hasModal && !composing.current) { e.preventDefault(); stamp('start'); } }} onClick={e => { if (e.detail === 0 && !hasModal && !composing.current) stamp('start'); }} onKeyDown={e => { if (e.key === 'Enter' && !e.repeat && !e.nativeEvent.isComposing && !composing.current) { e.preventDefault(); stamp('start'); } }}><strong>Tap</strong><span>左クリック・スペースで開始入力</span></button>}
        <div className="lyrics-footer"><button onClick={() => openHelp('shortcuts')}>ショートカット一覧</button><span>音源・歌詞の自動アップロードなし</span></div>
      </section>
      <section className={`subtitles-panel ${mobilePanel === 'subtitles' ? 'mobile-active' : ''}`} aria-label="字幕編集">
        <div className="panel-heading"><h2>字幕編集 <span className="count">{p.rows.length}行</span></h2><div className="panel-actions"><button {...hint('undo')} disabled={!snapshot.undoCount} onClick={() => { engine.undo(); setMessage('直前の字幕編集を取り消しました。'); }} aria-label="Undo">↶ Undo</button><button {...hint('redo')} disabled={!snapshot.redoCount} onClick={() => { engine.redo(); setMessage('字幕編集をやり直しました。'); }} aria-label="Redo">↷ Redo</button><label className="file-button" {...hint('srt')}>SRT読込<input type="file" aria-label="SRTを読み込む" accept=".srt,text/plain" onChange={fileHandler('srt')} /></label></div></div>
        {detail && <div className="batch-toolbar"><button onClick={() => run(() => engine.add(p.selectedId), '字幕行を追加しました。')}>行を追加</button><button {...hint('delete')} disabled={!current || current.locked} onClick={() => { const ids = p.selectedIds.length ? p.selectedIds : [p.selectedId!]; confirmEdit('字幕行を削除する', `${ids.length}行の字幕を削除します。`, () => run(() => engine.remove(ids), '字幕行を削除しました。')); }}>削除</button><button disabled={!current} onClick={() => run(() => engine.move(p.selectedId!, -1), '選択行を上へ移動しました。')}>上へ</button><button disabled={!current} onClick={() => run(() => engine.move(p.selectedId!, 1), '選択行を下へ移動しました。')}>下へ</button><span className="batch-divider" />
          <label>一括シフト<input aria-label="一括シフト量" type="number" value={shift} onChange={e => setShift(Math.round(Number(e.target.value)))} />ms</label><button disabled={!p.selectedIds.length} onClick={() => run(() => engine.shift(p.selectedIds, shift), '選択行をシフトしました。負の時刻になる場合は全行の移動量を0ms位置まで調整します。')}>適用</button><button {...hint('clear')} disabled={!p.selectedIds.length} onClick={() => confirmEdit('選択時刻をクリアする', `${p.selectedIds.length}行の開始・終了時刻を未設定に戻します。`, () => run(() => engine.clear(p.selectedIds, 'both'), '選択行の時刻を未設定に戻しました。'))}>選択時刻をクリア</button>
        </div>}
        <SubtitleTable project={p} engine={engine} issues={issues} onSelect={onSelect} />
        {current && <RowEditor row={current} number={number} engine={engine} detail={detail} run={run} confirmEdit={confirmEdit} />}
        <div className="validation-strip"><span className={errors.length ? 'error-text' : 'ready-text'}>{p.rows.length ? errors.length ? `${errors.length}件を修正するとSRT出力できます` : 'SRT出力の準備ができました' : '字幕行を生成してください'}</span><button onClick={() => setExportOpen(true)}>検証結果{warnings.length ? `・警告${warnings.length}件` : ''}</button></div>
      </section>
    </main>
    <footer className="app-footer"><p role="status" className="message">{message}</p><span>v1.0.0<button onClick={() => openHelp()}>使い方・ライセンス</button></span></footer>
    {settingsOpen && <Modal title="編集設定" onClose={() => setSettingsOpen(false)}><SettingsPanel settings={p.settings} update={value => engine.settings(value)} /><button className="primary modal-done" onClick={() => setSettingsOpen(false)}>設定を閉じる</button></Modal>}
    {helpOpen && <Modal title="使い方" className="help-dialog" onClose={() => setHelpOpen(false)}><HelpPanel topic={helpTopic} onTopic={setHelpTopic} onGuide={startGuide} /></Modal>}
    {exportOpen && <Modal title="SRT検証・出力" onClose={() => setExportOpen(false)}><label className="export-name">出力ファイル名<input value={p.settings.outputName} maxLength={500} onChange={e => engine.settings({ outputName: e.target.value })} aria-label="出力ファイル名" /></label><label className="check-label"><input type="checkbox" checked={p.settings.bom} onChange={e => engine.settings({ bom: e.target.checked })} />UTF-8 BOM付き</label>
      {!p.rows.length && <p>字幕行を生成するか、SRTを読み込んでください。</p>}
      <p className={errors.length ? 'error-text' : 'ready-text'}>{errors.length ? `${errors.length}件のエラーがあります。該当行を修正してください。` : p.rows.length ? 'すべての字幕が標準SRTとして出力できます。' : ''}</p>
      {!!warnings.length && <p className="warning-text">重複・行順の警告があります。確認後に出力できます。</p>}
      <ul className="issue-list">{issues.map((issue, index) => <li key={`${issue.rowId}-${index}`}><button className={issue.severity === 'error' ? 'error-text' : 'warning-text'} onClick={() => { onSelect(issue.rowId, true); setMobilePanel('subtitles'); setExportOpen(false); }}>行{issue.rowNumber}：{issue.message} <span>行へ移動</span></button></li>)}</ul>
      <button className="primary modal-done" disabled={!!errors.length || !p.rows.length} onClick={exportSrt}>SRTをダウンロード</button>
    </Modal>}
    {confirmation && <Modal title={confirmation.title} onClose={() => setConfirmation(null)}><p>{confirmation.text}</p><div className="modal-actions"><button onClick={() => setConfirmation(null)}>キャンセル</button><button className="primary" onClick={() => { const action = confirmation.action; setConfirmation(null); run(action); }}>{confirmation.label}</button></div></Modal>}
    {draft && <Modal title="自動下書きが見つかりました" onClose={() => setDraft(null)}><p>「{draft.name}」 {draft.rows.length}行<br />保存日時：{new Date(draft.savedAt).toLocaleString('ja-JP')}</p><p>ブラウザに保存された下書きです。プロジェクトJSONの復元とは別に扱います。音源は再選択が必要です。</p><div className="modal-actions"><button onClick={() => { setDraft(null); setMessage('現在の内容で作業を続けます。自動下書きを更新します。'); }}>現在の内容で続ける</button><button className="primary" onClick={() => { restore(draft, '自動下書き'); setDraft(null); }}>下書きを復元</button></div></Modal>}
    {guideStep !== null && <GuidedTour step={guideStep} onStep={changeGuideStep} onClose={closeGuide} />}
    <Tooltips />
  </div>;
}
