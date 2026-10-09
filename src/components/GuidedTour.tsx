import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import content from '../help/content.json';
import { keepDialogFocus } from './dialogFocus';
type Box = { x: number; y: number; width: number; height: number };
export function GuidedTour({ step, onStep, onClose }: { step: number; onStep: (step: number) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null), titleRef = useRef<HTMLHeadingElement>(null);
  const [box, setBox] = useState<Box | null>(null), [cardAtTop, setCardAtTop] = useState(false);
  const maskId = useId(), item = content.guideSteps[step];
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null, dialog = dialogRef.current!;
    dialog.showModal();
    titleRef.current?.focus({ preventScroll: true });
    return () => { dialog.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  useLayoutEffect(() => {
    let frame = 0;
    const candidates = [...document.querySelectorAll<HTMLElement>(item.selector)];
    // 広いパネルより、実際の編集欄を優先します。空の一覧では見出しを案内します。
    const targets = candidates.filter(element => !candidates.some(other => other !== element && element.contains(other)));
    if (item.id === 'edit' && !document.querySelector('.row-editor')) {
      targets.splice(0, targets.length, document.querySelector<HTMLElement>('.subtitles-panel .panel-heading')!);
    }
    const measure = () => {
      const rects = targets.filter(Boolean).map(element => element.getBoundingClientRect()).filter(rect => rect.width && rect.height);
      if (!rects.length) { setBox(null); return; }
      const x = Math.max(4, Math.min(...rects.map(r => r.left)) - 6), y = Math.max(4, Math.min(...rects.map(r => r.top)) - 6);
      const right = Math.min(innerWidth - 4, Math.max(...rects.map(r => r.right)) + 6), bottom = Math.min(innerHeight - 4, Math.max(...rects.map(r => r.bottom)) + 6);
      setBox({ x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) });
      setCardAtTop((y + bottom) / 2 > innerHeight * .56);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    targets[0]?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    schedule(); titleRef.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(schedule); targets.filter(Boolean).forEach(element => observer.observe(element));
    window.addEventListener('resize', schedule); window.addEventListener('scroll', schedule, true);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true); };
  }, [item]);
  return <dialog className="guide-dialog" ref={dialogRef} onCancel={onClose} onKeyDown={keepDialogFocus} aria-label="はじめての使い方" aria-describedby="guide-description">
    <svg className="guide-shade" aria-hidden="true" width="100%" height="100%"><defs><mask id={maskId}><rect width="100%" height="100%" fill="white" />{box && <rect {...box} rx="6" fill="black" />}</mask></defs><rect width="100%" height="100%" fill="rgba(2,9,18,.80)" mask={`url(#${maskId})`} />{box && <rect {...box} rx="6" fill="none" stroke="#85efff" strokeWidth="3" data-testid="guide-highlight" data-target={item.id} />}</svg>
    <section className={`guide-card ${cardAtTop ? 'guide-card-top' : ''}`}>
      <p className="guide-progress" role="status">はじめての使い方 · {step + 1} / {content.guideSteps.length}</p>
      <h2 ref={titleRef} tabIndex={-1}>{step + 1}. {item.title}</h2>
      <p id="guide-description">{item.body}</p><p className="guide-note">{item.note}</p>
      <p className="guide-safety">この案内は編集内容を変更しません。閉じてから操作できます。</p>
      <div className="guide-actions"><button onClick={onClose}>スキップ</button><button disabled={step === 0} onClick={() => onStep(step - 1)}>戻る</button>{step < content.guideSteps.length - 1 && <button className="primary" onClick={() => onStep(step + 1)}>次へ</button>}<button className={step === content.guideSteps.length - 1 ? 'primary' : ''} onClick={onClose}>終了</button></div>
    </section>
  </dialog>;
}
