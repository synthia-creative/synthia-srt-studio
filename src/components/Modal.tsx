import { useEffect, useRef, type ReactNode } from 'react';
import { keepDialogFocus } from './dialogFocus';
export function Modal({ title, children, onClose, className }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!, opener = document.activeElement as HTMLElement | null; dialog.showModal(); return () => { dialog.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); }; }, []);
  return <dialog ref={ref} onCancel={onClose} onKeyDown={keepDialogFocus} aria-label={title} className={className}>
    <div className="modal-heading"><h2>{title}</h2><button onClick={onClose} aria-label="閉じる">×</button></div>
    {children}
  </dialog>;
}
