import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

function wav(seconds = 8): Buffer {
  const rate = 8000, samples = rate * seconds, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + samples * 2, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(Math.sin(i / rate * 440 * Math.PI * 2) * (0.1 + 0.45 * Math.abs(Math.sin(i / rate * 3))) * 12000), 44 + i * 2);
  return bytes;
}
async function start(page: Page) {
  await page.goto('./'); await expect(page.getByRole('heading', { name: 'SYNTHIA SRT Studio' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '下書き' })).not.toContainText('確認中');
  await expect(page.getByRole('dialog', { name: 'はじめての使い方', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'スキップ', exact: true }).click();
}
async function generate(page: Page, lyrics = '[Verse]\n夜の向こうへ\nKeep the light\n[Chorus]\n星をつないで') {
  await page.getByLabel('歌詞を貼り付け', { exact: true }).fill(lyrics); await page.getByRole('button', { name: '字幕行を生成', exact: true }).click();
  await expect(page.getByTestId('subtitle-row-1')).toBeVisible();
}
async function loadAudio(page: Page) {
  await page.getByLabel('音源を読み込む', { exact: true }).setInputFiles({ name: 'test-song.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.getByRole('button', { name: '▶ 再生', exact: true })).toBeEnabled();
  await expect(page.getByText('波形をクリックして移動。Shift＋ドラッグでループ区間を選択。')).toBeVisible();
}
async function seek(page: Page, seconds: number) { await page.locator('audio').evaluate((element, time) => { (element as HTMLAudioElement).currentTime = time; }, seconds); }
async function key(page: Page, shortcut: string) { await page.locator('h1').click(); await page.keyboard.press(shortcut); }
const finished = '1\n00:00:01,000 --> 00:00:02,000\n夜の向こうへ\n\n2\n00:00:03,000 --> 00:00:04,000\nKeep the light\n';

test('Japanese lyrics, real WAV, R/E capture, last line, Undo/Redo and downloaded standard SRT', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await start(page); await generate(page); await loadAudio(page);
  await seek(page, 1.234); await key(page, 'r'); await seek(page, 2.5); await key(page, 'r'); await seek(page, 3.6); await key(page, 'r'); await seek(page, 4.5); await key(page, 'e');
  await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:01,234'); await expect(page.getByTestId('subtitle-row-3')).toContainText('00:00:04,500');
  await key(page, 'Control+z'); await expect(page.getByTestId('subtitle-row-3')).toContainText('未設定'); await key(page, 'Control+Shift+z'); await expect(page.getByTestId('subtitle-row-3')).toContainText('00:00:04,500');
  await page.getByRole('button', { name: 'SRT出力', exact: true }).click(); await page.getByLabel('出力ファイル名').fill('STARLIGHT MODE.srt');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'SRTをダウンロード' }).click(); const file = await download;
  expect(file.suggestedFilename()).toBe('STARLIGHT MODE.srt'); const content = await fs.readFile((await file.path())!, 'utf8');
  expect(content).toContain('00:00:01,234 --> 00:00:02,500'); expect(content).toContain('00:00:03,600 --> 00:00:04,500'); expect(content).not.toContain('[Verse]'); expect(content).not.toContain('--:--'); expect(errors).toEqual([]);
});
test('incomplete upstream SRT blocks export and issues navigate to the row', async ({ page }) => {
  await start(page); await page.getByLabel('SRTを読み込む', { exact: true }).setInputFiles({ name: 'draft.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n--:--,--- --> 00:02,000\n未完成') });
  await page.getByRole('button', { name: 'SRT出力', exact: true }).click(); await expect(page.getByRole('button', { name: 'SRTをダウンロード' })).toBeDisabled();
  await page.getByRole('button', { name: /行1：開始・終了時刻が未設定/ }).click(); await expect(page.getByLabel('開始時刻', { exact: true })).toHaveValue('');
});
test('completed SRT manual editing, re-export and invalid interval rejection', async ({ page }) => {
  await start(page); await page.getByLabel('SRTを読み込む', { exact: true }).setInputFiles({ name: 'test.srt', mimeType: 'text/plain', buffer: Buffer.from(finished) });
  await page.getByLabel('開始時刻', { exact: true }).fill('00:00:00,950'); await page.getByLabel('終了時刻', { exact: true }).fill('00:00:02,100'); await page.getByLabel('選択行の歌詞').fill('  夜を越えて  '); await page.getByRole('button', { name: '変更を反映' }).click();
  await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:00,950'); await page.getByLabel('開始時刻', { exact: true }).fill('00:00:05,000'); await page.getByRole('button', { name: '変更を反映' }).click();
  await expect(page.getByRole('status').filter({ hasText: '終了時刻は保持' })).toBeVisible(); await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:02,100');
  await page.getByRole('button', { name: 'SRT出力', exact: true }).click(); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'SRTをダウンロード' }).click();
  expect(await fs.readFile((await (await download).path())!, 'utf8')).toContain('  夜を越えて  ');
});
test('Shift+R, Shift+E, offsets, arrow nudge and individual endings follow reference semantics', async ({ page }) => {
  await start(page); await generate(page); await loadAudio(page); await seek(page, 1); await key(page, 'r'); await seek(page, 2); await key(page, 'Shift+r');
  await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:02,000'); await expect(page.getByTestId('subtitle-row-2')).toContainText('00:00:02,000');
  await seek(page, 4); await key(page, 'Shift+e'); await expect(page.getByTestId('subtitle-row-3')).toContainText('00:00:04,000');
  await page.getByRole('button', { name: '設定', exact: true }).click(); await page.getByLabel('タイミング入力', { exact: true }).selectOption('individual'); await page.getByLabel('タップ入力オフセット（ms）').fill('-50'); await page.getByLabel('Wキーの追加補正（ms）').fill('-100'); await page.getByRole('button', { name: '設定を閉じる' }).click();
  await page.getByRole('button', { name: '3行目の開始を編集' }).click(); await seek(page, 3); await key(page, 'w'); await expect(page.getByTestId('subtitle-row-3')).toContainText('00:00:02,850'); await key(page, 'Shift+ArrowRight'); await expect(page.getByTestId('subtitle-row-3')).toContainText('00:00:02,950');
});
test('text focus, IME, repeated keys and modal focus never stamp subtitles', async ({ page }) => {
  await start(page); await generate(page); await loadAudio(page); await seek(page, 1);
  await page.getByLabel('選択行の歌詞').focus(); await page.keyboard.press('r'); await expect(page.getByTestId('subtitle-row-1')).toContainText('未設定');
  await page.locator('h1').click(); await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', isComposing: true, bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', repeat: true, bubbles: true })); });
  await expect(page.getByTestId('subtitle-row-1')).toContainText('未設定'); await page.getByRole('button', { name: '設定', exact: true }).click(); await page.keyboard.press('r'); await expect(page.getByTestId('subtitle-row-1')).toContainText('未設定');
});
test('JSON download/restore without embedded audio, bad restore safety, IndexedDB draft recovery', async ({ page }) => {
  await start(page); await generate(page); await loadAudio(page); await seek(page, 1.25); await key(page, 'r'); await page.getByLabel('プロジェクト', { exact: true }).fill('テスト曲');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'プロジェクト保存', exact: true }).click(); const file = await download, json = await fs.readFile((await file.path())!, 'utf8'); const saved = JSON.parse(json);
  expect(file.suggestedFilename()).toBe('テスト曲.synthia-srt.json'); expect(saved.playbackPositionMs).toBe(1250); expect(saved.audioFilename).toBe('test-song.wav'); expect(saved.audio).toBeUndefined();
  await page.getByLabel('プロジェクトを復元', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{oops') }); await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:01,250');
  await page.getByLabel('プロジェクトを復元', { exact: true }).setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(json) }); await page.getByRole('button', { name: '置き換える', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: '再選択' })).toBeVisible(); await expect(page.getByRole('button', { name: '▶ 再生', exact: true })).toBeDisabled();
  await loadAudio(page); await expect(page.getByTestId('playback-time')).toHaveText('00:00:01,250'); await expect(page.getByRole('status').filter({ hasText: '下書きを自動保存しました' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('dialog', { name: '自動下書きが見つかりました' })).toBeVisible(); await page.getByRole('button', { name: '下書きを復元', exact: true }).click(); await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:01,250'); await expect(page.getByLabel('プロジェクト', { exact: true })).toHaveValue('テスト曲');
});
test('play/pause, speed, zoom, loop selection, tap assist and explicit end mode', async ({ page }) => {
  await start(page); await generate(page); await loadAudio(page); await page.getByLabel('再生速度').selectOption('0.5'); await expect.poll(() => page.locator('audio').evaluate(a => (a as HTMLAudioElement).playbackRate)).toBe(0.5);
  await page.getByRole('button', { name: '▶ 再生', exact: true }).click(); await expect(page.getByRole('button', { name: 'Ⅱ 停止', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Ⅱ 停止', exact: true }).click();
  await page.getByRole('button', { name: '区間選択', exact: true }).click(); const box = (await page.getByRole('slider').boundingBox())!; await page.mouse.move(box.x + box.width / 8, box.y + 70); await page.mouse.down(); await page.mouse.move(box.x + box.width * 3 / 8, box.y + 70); await page.mouse.up();
  await expect(page.getByRole('button', { name: '↻ ループ', exact: true })).toHaveAttribute('aria-pressed', 'true'); await page.getByLabel('波形拡大').selectOption('4');
  await page.getByRole('button', { name: '▶ 再生', exact: true }).click(); await seek(page, 3.5);
  await expect.poll(() => page.locator('audio').evaluate(a => (a as HTMLAudioElement).currentTime)).toBeLessThan(3);
  await page.getByRole('button', { name: 'Ⅱ 停止', exact: true }).click();
  await page.getByRole('button', { name: '設定', exact: true }).click(); await page.getByLabel('タップ補助モード', { exact: true }).check(); await page.getByRole('button', { name: '設定を閉じる' }).click();
  await seek(page, 1); await key(page, 'Space'); await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:01,000'); await seek(page, 2); await page.getByRole('button', { name: /Tap 左クリック/ }).click(); await expect(page.getByTestId('subtitle-row-2')).toContainText('00:00:02,000');
});
test('bulk selection/shift, boundary operation, lock, add/delete/reorder and Undo', async ({ page }) => {
  await start(page); await page.getByLabel('SRTを読み込む', { exact: true }).setInputFiles({ name: 'test.srt', mimeType: 'text/plain', buffer: Buffer.from(finished) }); await page.getByRole('button', { name: '詳細編集', exact: true }).click();
  await page.getByLabel('全行を選択', { exact: true }).check(); await page.getByLabel('一括シフト量').fill('100'); await page.getByRole('button', { name: '適用', exact: true }).click(); await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:01,100');
  await page.getByRole('button', { name: '2行目の開始を編集' }).click(); await page.getByRole('button', { name: '前行の終了を合わせる', exact: true }).click(); await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:03,100');
  await page.getByLabel('ロック', { exact: true }).check(); await expect(page.getByRole('button', { name: '変更を反映', exact: true })).toBeDisabled(); await page.getByLabel('ロック', { exact: true }).uncheck();
  await page.getByRole('button', { name: '上へ', exact: true }).click(); await expect(page.getByTestId('subtitle-row-1')).toContainText('Keep the light'); await page.getByRole('button', { name: '行を追加', exact: true }).click(); await expect(page.getByTestId('subtitle-row-3')).toBeVisible();
  await page.getByLabel('全行を選択', { exact: true }).uncheck(); await page.getByRole('button', { name: '削除', exact: true }).click(); await page.getByRole('button', { name: '実行する', exact: true }).click(); await expect(page.getByTestId('subtitle-row-3')).toHaveCount(0); await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.getByTestId('subtitle-row-3')).toBeVisible();
});
test('GitHub Pages nested path resolves compiled assets and MIT notices', async ({ page, request }) => {
  const failures: string[] = []; page.on('requestfailed', request => failures.push(request.url())); await start(page);
  expect(page.url()).toContain('/synthia-srt-studio/'); await page.getByRole('button', { name: '使い方・ライセンス', exact: true }).click();
  const href = await page.getByRole('link', { name: '原作者のライセンス' }).getAttribute('href'); const response = await request.get(new URL(href!, page.url()).href); expect(response.ok()).toBe(true); expect(await response.text()).toContain('Copyright (c) 2026 cityedge'); expect(failures).toEqual([]);
});
test('desktop/tablet/mobile layouts and screenshots with real waveform', async ({ page }) => {
  await start(page); await generate(page); await loadAudio(page); await seek(page, 1); await key(page, 'r'); await seek(page, 2.5); await key(page, 'r'); await seek(page, 4); await key(page, 'r'); await seek(page, 6); await key(page, 'e');
  await page.getByRole('button', { name: '詳細編集', exact: true }).click(); await page.getByLabel('プロジェクト', { exact: true }).fill('STARLIGHT MODE');
  await fs.mkdir('docs/qa', { recursive: true });
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    if (width <= 800) await page.getByRole('button', { name: '字幕編集（3）', exact: true }).click();
    await expect(page.getByRole('heading', { name: /字幕編集/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => page.getByTestId('subtitle-row-3').evaluate(row => {
      const parent = row.closest('.table-scroll')!; return row.getBoundingClientRect().bottom <= parent.getBoundingClientRect().bottom + 1;
    })).toBe(true);
    if (width === 1440) expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    await page.screenshot({ path: path.join('docs/qa', `${name}.png`), fullPage: true });
  }
});
test('Japanese TXT file and audio-free JSON project can be saved and restored safely', async ({ page }) => {
  await start(page); const text = '[Verse]\n  日本語の歌  \n[Chorus]\nHello world';
  await page.getByLabel('TXTを読み込む', { exact: true }).setInputFiles({ name: '星の歌.txt', mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
  await expect(page.getByLabel('歌詞を貼り付け', { exact: true })).toHaveValue(text); await page.getByRole('button', { name: '字幕行を生成', exact: true }).click();
  await expect(page.getByTestId('subtitle-row-2')).toContainText('Hello world');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'プロジェクト保存', exact: true }).click(); const json = await fs.readFile((await (await download).path())!, 'utf8'); expect(JSON.parse(json).audioFilename).toBeNull();
  await page.getByLabel('プロジェクトを復元', { exact: true }).setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(json) }); await page.getByRole('button', { name: '置き換える', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: '音源は未選択' })).toBeVisible(); await expect(page.getByTestId('subtitle-row-1')).toContainText('日本語の歌');
});
test('waveform decode failure leaves real audio playback and timing edit usable', async ({ page }) => {
  await page.addInitScript(() => { AudioContext.prototype.decodeAudioData = () => Promise.reject(new Error('検証用：波形解析に失敗しました。再生・編集は続行できます。')); });
  await start(page); await generate(page); await page.getByLabel('音源を読み込む', { exact: true }).setInputFiles({ name: 'fallback.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.getByText('検証用：波形解析に失敗しました。再生・編集は続行できます。')).toBeVisible(); await page.getByRole('button', { name: '▶ 再生', exact: true }).click(); await expect(page.getByRole('button', { name: 'Ⅱ 停止', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Ⅱ 停止', exact: true }).click();
  await seek(page, 1.234); await key(page, 'r'); await expect(page.getByTestId('subtitle-row-1')).toContainText('00:00:01,234');
});
