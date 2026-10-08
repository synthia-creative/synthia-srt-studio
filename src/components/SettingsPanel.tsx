import type { Settings } from '../core/types';
export function SettingsPanel({ settings, update }: { settings: Settings; update: (value: Partial<Settings>) => void }) {
  return <div className="settings-grid">
    <label>タイミング入力<select aria-label="タイミング入力" value={settings.timingMode} onChange={e => update({ timingMode: e.target.value as Settings['timingMode'] })}><option value="continuous">連続字幕：次の開始で前行を終了</option><option value="individual">個別終了：Eでのみ終了を入力</option></select></label>
    <label>Eキーの対象<select aria-label="Eキーの対象" value={settings.endTarget} onChange={e => update({ endTarget: e.target.value as Settings['endTarget'] })}><option value="active">最後にRで開始した行</option><option value="selected">現在選択している行</option></select></label>
    <p className="field-help">Shift＋Eは、この対象を一時的に反転します。</p>
    <label>タップ入力オフセット（ms）<input type="number" min={-10000} max={10000} step={10} value={settings.tapOffsetMs} onChange={e => update({ tapOffsetMs: Math.min(10000, Math.max(-10000, Math.round(Number(e.target.value)))) })} /></label>
    <label>Wキーの追加補正（ms）<input type="number" min={-10000} max={10000} step={10} value={settings.wOffsetMs} onChange={e => update({ wOffsetMs: Math.min(10000, Math.max(-10000, Math.round(Number(e.target.value)))) })} /></label>
    <p className="field-help">入力時刻に加算します。遅れを補正する場合は負の値を指定してください。</p>
    <label className="check-label"><input type="checkbox" checked={settings.tapAssist} onChange={e => update({ tapAssist: e.target.checked })} />タップ補助モード</label>
    <p className="field-help">有効時はスペースと専用タップ領域で開始を入力します。再生・停止はプレイヤーのボタンを使ってください。</p>
    <label className="check-label"><input type="checkbox" checked={settings.bom} onChange={e => update({ bom: e.target.checked })} />SRTをUTF-8 BOM付きで出力</label>
  </div>;
}
