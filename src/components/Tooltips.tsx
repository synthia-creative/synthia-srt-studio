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
    const show = (event: Event) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tooltip]') : null;
      if (!element) { hide(); return; }
      if (element === target) return;
      hide(); target = element; previousDescription = element.getAttribute('aria-describedby');
      element.setAttribute('aria-describedby', [previousDescription, 'studio-tooltip'].filter(Boolean).join(' '));
      const rect = element.getBoundingClientRect();
      setTip({ text: element.dataset.tooltip!, x: Math.max(8, Math.min(innerWidth - 308, rect.left)), y: rect.top < 100 ? rect.bottom + 8 : rect.top - 92, root: element.closest('dialog') ?? document.body });
    };
    const leave = (event: Event) => { if (!(event instanceof PointerEvent || event instanceof FocusEvent) || !(event.relatedTarget instanceof Node) || !target?.contains(event.relatedTarget)) hide(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    document.addEventListener('pointerover', show); document.addEventListener('focusin', show); document.addEventListener('pointerout', leave); document.addEventListener('focusout', leave); document.addEventListener('keydown', escape); window.addEventListener('scroll', hide, true); window.addEventListener('resize', hide);
    return () => { hide(); document.removeEventListener('pointerover', show); document.removeEventListener('focusin', show); document.removeEventListener('pointerout', leave); document.removeEventListener('focusout', leave); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); };
  }, []);
  return tip && createPortal(<div id="studio-tooltip" role="tooltip" className="button-tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>, tip.root);
}
