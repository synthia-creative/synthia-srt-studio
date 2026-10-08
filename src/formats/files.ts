export async function readText(file: File): Promise<string> {
  if (file.size > 20000000) throw new Error('テキストファイルは20MB以内で読み込んでください。');
  const buffer = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { return new TextDecoder('shift_jis', { fatal: true }).decode(buffer); }
}
export function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeFilename(name: string, extension: string): string {
  const cleaned = name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '') || 'subtitles';
  return cleaned.toLowerCase().endsWith(extension) ? cleaned : cleaned + extension;
}
