import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
export function Tooltips() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; root: Element } | null>(null);
  useEffect(() => {
    let target: HTMLElement | null = null, previousDescription: string | null = null;
    const hide = () => {
      if (target) { if (previousDescription) target.setAttribute('aria-describedby', previousDescription); else target.removeAttribute('aria-describedby'); }
      target = null; setTip(null);
    };
    const position = () => {
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setTip({ text: target.dataset.tooltip!, x: Math.max(8, Math.min(innerWidth - 308, rect.left)), y: rect.top < 100 ? rect.bottom + 8 : rect.top - 92, root: target.closest('dialog') ?? document.body });
    };
    const show = (event: Event) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tooltip]') : null;
      if (!element) { if (!target?.contains(document.activeElement)) hide(); return; }
      if (element === target) return;
      hide(); target = element; previousDescription = element.getAttribute('aria-describedby');
      element.setAttribute('aria-describedby', [previousDescription, 'studio-tooltip'].filter(Boolean).join(' '));
      position();
    };
    const leave = (event: Event) => {
      if (!(event instanceof PointerEvent || event instanceof FocusEvent) || !(event.target instanceof Node) || !target?.contains(event.target)) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      // フォーカス中の説明は、マウス移動や遅れて届くスクロールで消しません。
      if (event instanceof PointerEvent && target.contains(document.activeElement)) return;
      hide();
    };
    const layout = () => { if (target?.contains(document.activeElement)) position(); else hide(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    document.addEventListener('pointerover', show); document.addEventListener('focusin', show); document.addEventListener('pointerout', leave); document.addEventListener('focusout', leave); document.addEventListener('keydown', escape); window.addEventListener('scroll', layout, true); window.addEventListener('resize', layout);
    return () => { hide(); document.removeEventListener('pointerover', show); document.removeEventListener('focusin', show); document.removeEventListener('pointerout', leave); document.removeEventListener('focusout', leave); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', layout, true); window.removeEventListener('resize', layout); };
  }, []);
  return tip && createPortal(<div id="studio-tooltip" role="tooltip" className="button-tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>, tip.root);
}
