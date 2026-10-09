export const GUIDE_STORAGE_KEY = 'synthia-srt-studio.guide.v1';
export function hasSeenGuide() {
  try { return localStorage.getItem(GUIDE_STORAGE_KEY) === 'seen'; }
  catch { return false; }
}
export function rememberGuide() {
  try { localStorage.setItem(GUIDE_STORAGE_KEY, 'seen'); }
  catch { /* 保存を禁止したブラウザでも、ガイドを終了できます。 */ }
}
