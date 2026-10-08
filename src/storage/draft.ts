import { parseProject } from '../formats/project';
import type { Project } from '../core/types';
const DATABASE = 'synthia-srt-studio', STORE = 'drafts', KEY = 'current';
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error ?? new Error('IndexedDBを利用できません。'));
    request.onblocked = () => reject(new Error('別のタブを閉じて下書き保存をやり直してください。'));
    request.onsuccess = () => resolve(request.result);
  });
}
async function transaction(mode: IDBTransactionMode, value?: string): Promise<unknown> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), store = tx.objectStore(STORE);
    const request = mode === 'readonly' ? store.get(KEY) : store.put(value, KEY);
    let result: unknown;
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('下書き保存に失敗しました。')); };
  });
}
export async function loadDraft(): Promise<Project | null> {
  const value = await transaction('readonly');
  return value === undefined ? null : parseProject(String(value));
}
export async function saveDraft(json: string): Promise<void> { await transaction('readwrite', json); }
