import { useEffect, useRef, type ReactNode } from 'react';
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} onCancel={onClose} aria-label={title}>
    <div className="modal-heading"><h2>{title}</h2><button onClick={onClose} aria-label="閉じる">×</button></div>
    {children}
  </dialog>;
}
