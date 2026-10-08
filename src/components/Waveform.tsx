import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../core/time';
import type { Waveform as WaveformData } from '../media/waveform';
import type { Settings } from '../core/types';
export function Waveform({ waveform, durationMs, positionMs, zoom, loop, onSeek, onLoop, status }: {
  waveform: WaveformData | null; durationMs: number; positionMs: number; zoom: number; loop: Settings['loop'];
  onSeek: (ms: number) => void; onLoop: (startMs: number, endMs: number) => void; status: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null), drag = useRef<{ start: number; offset: number; span: number; selecting: boolean } | null>(null);
  const [width, setWidth] = useState(800), [selecting, setSelecting] = useState(false), [selection, setSelection] = useState<[number, number] | null>(null);
  const span = Math.max(1, durationMs / zoom), offset = Math.max(0, Math.min(durationMs - span, positionMs - span / 2));
  useEffect(() => {
    const element = canvasRef.current!;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width)); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current!, ratio = window.devicePixelRatio || 1, height = 112;
    if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
    if (canvas.height !== height * ratio) canvas.height = height * ratio;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#081420'; ctx.fillRect(0, 0, width, height);
    const x = (ms: number) => (ms - offset) / span * width;
    ctx.strokeStyle = '#1a2a3b'; ctx.lineWidth = 1;
    const ticks = Math.max(2, Math.min(8, Math.floor(width / 120)));
    for (let i = 0; i <= ticks; i++) {
      const px = width * i / ticks; ctx.beginPath(); ctx.moveTo(px, 22); ctx.lineTo(px, height); ctx.stroke();
      ctx.fillStyle = '#8a9dae'; ctx.font = '11px Consolas, monospace'; ctx.textAlign = i === ticks ? 'right' : 'left';
      ctx.fillText(formatTime(Math.round(offset + span * i / ticks)).slice(3), px + (i === ticks ? -4 : 4), 14);
    }
    if (loop.enabled || selection) {
      const [start, end] = selection ?? [loop.startMs, loop.endMs];
      ctx.fillStyle = '#258ec82e'; ctx.fillRect(x(Math.min(start, end)), 22, x(Math.max(start, end)) - x(Math.min(start, end)), height - 22);
    }
    const middle = 66;
    ctx.strokeStyle = '#294156'; ctx.beginPath(); ctx.moveTo(0, middle); ctx.lineTo(width, middle); ctx.stroke();
    if (waveform) {
      ctx.strokeStyle = '#4fcee0'; ctx.lineWidth = 1.5;
      for (let px = 0; px < width; px += 2) {
        const time = offset + px / width * span, bucket = Math.floor(time / waveform.durationMs * waveform.peaks.length);
        const magnitude = Math.max(1, (waveform.peaks[bucket] || 0) * 34);
        ctx.beginPath(); ctx.moveTo(px, middle - magnitude); ctx.lineTo(px, middle + magnitude); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#8496a8'; ctx.font = '13px "Yu Gothic UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(durationMs ? '波形がなくても、ここをクリックして再生位置を変更できます' : 'MP3 / WAV を読み込んで、歌詞のタイミングを合わせましょう', width / 2, 61);
    }
    if (durationMs) {
      const px = x(positionMs); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, 22); ctx.lineTo(px, height); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(px - 4, 22); ctx.lineTo(px + 4, 22); ctx.lineTo(px, 28); ctx.fill();
    }
  }, [waveform, durationMs, positionMs, offset, span, width, loop, selection]);
  const timeAt = (clientX: number, viewOffset = offset, viewSpan = span) => {
    const bounds = canvasRef.current!.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(durationMs, viewOffset + Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) * viewSpan)));
  };
  return <div className="waveform">
    <canvas ref={canvasRef} role="slider" aria-label="波形の再生位置" aria-valuemin={0} aria-valuemax={durationMs} aria-valuenow={positionMs} aria-valuetext={formatTime(positionMs)} tabIndex={0}
      onKeyDown={event => { if (event.key === 'Home') { event.preventDefault(); onSeek(0); } if (event.key === 'End') { event.preventDefault(); onSeek(durationMs); } }}
      onPointerDown={event => {
        if (event.button !== 0 || !durationMs) return;
        const start = timeAt(event.clientX), range = selecting || event.shiftKey;
        drag.current = { start, offset, span, selecting: range }; event.currentTarget.setPointerCapture(event.pointerId);
        if (range) setSelection([start, start]); else onSeek(start);
      }} onPointerMove={event => {
        const current = drag.current;
        if (current?.selecting) setSelection([current.start, timeAt(event.clientX, current.offset, current.span)]);
      }} onPointerUp={event => {
        const current = drag.current; drag.current = null;
        if (current?.selecting) { const end = timeAt(event.clientX, current.offset, current.span); if (end !== current.start) onLoop(Math.min(end, current.start), Math.max(end, current.start)); setSelection(null); setSelecting(false); }
      }} onPointerCancel={() => { drag.current = null; setSelection(null); }} />
    <div className="wave-caption"><span>{status}</span><button className="small-button" aria-pressed={selecting} disabled={!durationMs} onClick={() => setSelecting(!selecting)}>区間選択</button></div>
  </div>;
}
