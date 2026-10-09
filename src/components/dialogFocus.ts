import type { KeyboardEvent } from 'react';

// 案内の最後／最初からTabで移動したときも、操作対象をダイアログ内に保ちます。
export function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
  const first = items[0], last = items.at(-1), active = document.activeElement;
  if (!first || !last) { event.preventDefault(); event.currentTarget.focus(); return; }
  if (event.shiftKey && (active === first || !items.includes(active as HTMLElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (active === last || !event.currentTarget.contains(active))) { event.preventDefault(); first.focus(); }
}
