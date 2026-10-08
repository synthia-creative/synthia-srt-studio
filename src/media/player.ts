import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings } from '../core/types';
import { milliseconds } from '../core/time';
import { analyzeWaveform, type Waveform } from './waveform';
export function loopPosition(currentMs: number, loop: Settings['loop'], durationMs: number): number {
  if (!loop.enabled || loop.endMs <= loop.startMs || loop.startMs >= durationMs) return currentMs;
  return currentMs >= Math.min(loop.endMs, durationMs) || currentMs < loop.startMs ? loop.startMs : currentMs;
}
export function usePlayer(settings: Settings, onError: (message: string) => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const errorRef = useRef(onError); errorRef.current = onError;
  const urlRef = useRef<string | null>(null), abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(0), fileRef = useRef<File | null>(null);
  const [loaded, setLoaded] = useState(false), [playing, setPlaying] = useState(false);
  const [positionMs, setPosition] = useState(0), [durationMs, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<Waveform | null>(null), [waveStatus, setWaveStatus] = useState('音源を読み込むと波形を表示します。');
  const capture = useCallback(() => milliseconds(audioRef.current?.currentTime ?? 0), []);
  const seek = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (!audio || !loaded) return;
    const time = Math.max(0, Math.min(milliseconds(audio.duration || 0), ms));
    audio.currentTime = time / 1000; setPosition(time);
  }, [loaded]);
  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !loaded) { errorRef.current('先に音源ファイルを読み込んでください。'); return; }
    try { if (audio.paused) await audio.play(); else audio.pause(); }
    catch { errorRef.current('音源を再生できません。ブラウザで再生可能なMP3／WAVを選んでください。'); }
  }, [loaded]);
  const unload = useCallback(() => {
    abortRef.current?.abort(); fileRef.current = null;
    const audio = audioRef.current; if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = null;
    setLoaded(false); setPlaying(false); setPosition(0); setDuration(0); setWaveform(null); setWaveStatus('音源を読み込むと波形を表示します。');
  }, []);
  const load = useCallback((file: File, position = 0) => {
    unload(); const audio = audioRef.current; if (!audio) return;
    fileRef.current = file; pendingRef.current = position;
    const url = URL.createObjectURL(file); urlRef.current = url;
    audio.src = url; audio.load(); setWaveStatus('音源を読み込んでいます…');
  }, [unload]);
  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    let frame = 0, disposed = false;
    const tick = () => {
      if (audio.readyState >= 1 && audio.src && Number.isFinite(audio.duration)) {
        const current = milliseconds(audio.currentTime), duration = milliseconds(audio.duration);
        if (!audio.paused) {
          const looped = loopPosition(current, settingsRef.current.loop, duration);
          if (looped !== current) audio.currentTime = looped / 1000;
        }
        setPosition(milliseconds(audio.currentTime));
      }
      frame = requestAnimationFrame(tick);
    };
    const metadata = () => {
      if (!Number.isFinite(audio.duration)) { errorRef.current('音源の長さを取得できません。'); return; }
      setLoaded(true); setDuration(milliseconds(audio.duration));
      audio.currentTime = Math.min(pendingRef.current / 1000, audio.duration); pendingRef.current = 0;
      audio.playbackRate = settingsRef.current.playbackRate;
      const file = fileRef.current; if (!file) return;
      const controller = new AbortController(); abortRef.current = controller; setWaveStatus('波形を解析しています…');
      analyzeWaveform(file, audio.duration, controller.signal).then(wave => {
        if (!controller.signal.aborted && !disposed) { setWaveform(wave); setWaveStatus('波形をクリックして移動。Shift＋ドラッグでループ区間を選択。'); }
      }).catch(error => { if (!controller.signal.aborted && !disposed) { setWaveStatus(error instanceof Error ? error.message : '波形解析に失敗しました。再生・編集は続行できます。'); } });
    };
    const play = () => setPlaying(true), pause = () => setPlaying(false);
    const ended = () => {
      if (settingsRef.current.loop.enabled && settingsRef.current.loop.startMs < milliseconds(audio.duration)) {
        audio.currentTime = settingsRef.current.loop.startMs / 1000; void audio.play().catch(() => errorRef.current('ループ再生を再開できません。'));
      } else setPlaying(false);
    };
    const failure = () => { setLoaded(false); setWaveStatus('音源を読み込めません。別のファイルを選んでください。'); errorRef.current('この音源を再生できません。MP3／WAVをご確認ください。'); };
    audio.addEventListener('loadedmetadata', metadata); audio.addEventListener('play', play); audio.addEventListener('pause', pause); audio.addEventListener('ended', ended); audio.addEventListener('error', failure);
    frame = requestAnimationFrame(tick);
    return () => { disposed = true; cancelAnimationFrame(frame); audio.removeEventListener('loadedmetadata', metadata); audio.removeEventListener('play', play); audio.removeEventListener('pause', pause); audio.removeEventListener('ended', ended); audio.removeEventListener('error', failure); };
  }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = settings.playbackRate; }, [settings.playbackRate]);
  useEffect(() => () => { abortRef.current?.abort(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  return { audioRef, capture, seek, toggle, load, unload, loaded, playing, positionMs, durationMs, waveform, waveStatus };
}
