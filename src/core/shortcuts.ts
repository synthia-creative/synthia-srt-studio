export interface ShortcutEvent {
  key: string; code?: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean;
  repeat: boolean; isComposing: boolean; keyCode?: number;
}
export type Shortcut = 'start' | 'correctedStart' | 'end' | 'undo' | 'redo' | 'up' | 'down' | 'left' | 'right' | 'nudgeLeft' | 'nudgeRight' | 'space';
export function resolveShortcut(event: ShortcutEvent, blocked: boolean): Shortcut | null {
  if (blocked || event.repeat || event.isComposing || event.keyCode === 229 || event.altKey) return null;
  const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey;
  if (modifier) {
    if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
    if (key === 'y') return 'redo';
    return null;
  }
  switch (key) {
    case 'r': return 'start'; case 'w': return 'correctedStart'; case 'e': return 'end'; case 'z': return event.shiftKey ? null : 'undo';
    case 'arrowup': return 'up'; case 'arrowdown': return 'down';
    case 'arrowleft': return event.shiftKey ? 'nudgeLeft' : 'left';
    case 'arrowright': return event.shiftKey ? 'nudgeRight' : 'right';
    case ' ': return 'space'; default: return null;
  }
}
export function isInputTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
}
