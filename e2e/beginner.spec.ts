import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import content from '../src/help/content.json' with { type: 'json' };
import { GUIDE_STORAGE_KEY } from '../src/help/onboarding';

const lyrics = '[Verse]\nはじめの歌（検証用）\nKeep the light';
const completedSrt = '1\n00:00:01,000 --> 00:00:03,000\nはじめの歌（検証用）\n\n2\n00:00:03,000 --> 00:00:06,000\nKeep the light\n';
const tour = (page: Page) => page.getByRole('dialog', { name: 'はじめての使い方', exact: true });
function wav() {
  const rate = 8000, samples = rate * 8, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(36 + samples * 2, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(Math.sin(i / rate * 440 * Math.PI * 2) * (0.1 + 0.45 * Math.abs(Math.sin(i / rate * 3))) * 12000), 44 + i * 2);
  return bytes;
}
async function openFresh(page: Page) { await page.goto('./'); await expect(tour(page)).toBeVisible(); }
async function start(page: Page) { await openFresh(page); await tour(page).getByRole('button', { name: 'スキップ', exact: true }).click(); }
async function openHelp(page: Page, topic = 'はじめての使い方') { await page.getByRole('button', { name: '使い方', exact: true }).click(); await page.getByRole('navigation', { name: 'ヘルプの目次' }).getByRole('button', { name: topic, exact: true }).click(); }
async function prepare(page: Page) {
  await page.getByLabel('歌詞を貼り付け', { exact: true }).fill(lyrics); await page.getByRole('button', { name: '字幕行を生成', exact: true }).click();
  await page.getByLabel('音源を読み込む', { exact: true }).setInputFiles({ name: 'ガイド検証音源.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.getByRole('button', { name: '▶ 再生', exact: true })).toBeEnabled(); await expect(page.getByText('波形をクリックして移動。Shift＋ドラッグでループ区間を選択。')).toBeVisible();
}
async function stamp(page: Page, seconds: number, key: string) { await page.locator('audio').evaluate((audio, time) => { (audio as HTMLAudioElement).currentTime = time; }, seconds); await page.locator('h1').click(); await page.keyboard.press(key); }
async function project(page: Page) { const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'プロジェクト保存', exact: true }).click(); const file = await download; return JSON.parse(await fs.readFile((await file.path())!, 'utf8')); }

test('first visit walks real targets, supports back/skip/finish/Esc, and remembers dismissal', async ({ page }) => {
  await openFresh(page); await expect(tour(page).getByRole('heading')).toBeFocused(); await expect(tour(page).getByRole('button', { name: '戻る', exact: true })).toBeDisabled();
  for (let step = 0; step < 5; step++) {
    await expect(tour(page).getByRole('heading')).toHaveText(`${step + 1}. ${content.guideSteps[step].title}`);
    await expect(page.getByTestId('guide-highlight')).toHaveAttribute('data-target', content.guideSteps[step].id);
    const highlight = await page.getByTestId('guide-highlight').boundingBox(); expect(highlight!.width).toBeGreaterThan(20); expect(highlight!.height).toBeGreaterThan(20);
    if (step < 4) await tour(page).getByRole('button', { name: '次へ', exact: true }).click();
  }
  await tour(page).getByRole('button', { name: '終了', exact: true }).click(); await expect(tour(page)).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), GUIDE_STORAGE_KEY)).toBe('seen');
  await openHelp(page); await page.getByRole('button', { name: 'はじめてガイドを開始' }).click(); await tour(page).getByRole('button', { name: '次へ' }).click(); await tour(page).getByRole('button', { name: '戻る' }).click(); await expect(tour(page).getByRole('heading')).toHaveText('1. 歌詞を入力する'); await tour(page).getByRole('button', { name: 'スキップ' }).click();
  await openHelp(page); await page.getByRole('button', { name: 'はじめてガイドを開始' }).click(); await page.keyboard.press('Escape'); await expect(tour(page)).toHaveCount(0);
  await page.reload(); const draft = page.getByRole('dialog', { name: '自動下書きが見つかりました' }); await expect(draft).toBeVisible(); await draft.getByRole('button', { name: '現在の内容で続ける' }).click(); await expect(tour(page)).toHaveCount(0);
});

test('help and guide keep draft fields, project rows, selection and undo history; keys are blocked', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await start(page); await prepare(page); await stamp(page, 1, 'r'); await page.getByLabel('プロジェクト', { exact: true }).fill('途中の作業');
  await page.getByLabel('開始時刻', { exact: true }).fill('00:00:02,300'); await page.getByLabel('選択行の歌詞').fill('反映前の入力も残す');
  const before = await project(page); const undoBefore = await page.getByRole('button', { name: 'Undo', exact: true }).isEnabled();
  await openHelp(page, 'R/Eキーの操作'); await page.getByRole('region', { name: '使い方の説明' }).focus();
  for (const key of ['r', 'e', 'w', 'z', 'Control+z', 'Control+y', 'ArrowDown', 'Shift+ArrowLeft', ' ']) await page.keyboard.press(key);
  await page.getByRole('navigation', { name: 'ヘルプの目次' }).getByRole('button', { name: 'はじめての使い方', exact: true }).click(); await page.getByRole('button', { name: 'はじめてガイドを開始' }).click();
  for (const key of ['r', 'e', 'w', 'z', 'Control+z', 'ArrowDown', 'Shift+ArrowLeft', ' ']) await page.keyboard.press(key);
  await tour(page).getByRole('button', { name: '終了' }).click();
  await expect(page.getByLabel('開始時刻', { exact: true })).toHaveValue('00:00:02,300'); await expect(page.getByLabel('選択行の歌詞')).toHaveValue('反映前の入力も残す'); await expect(page.getByLabel('プロジェクト', { exact: true })).toHaveValue('途中の作業');
  const after = await project(page); delete before.savedAt; delete after.savedAt; expect(after).toEqual(before); expect(await page.getByRole('button', { name: 'Undo', exact: true }).isEnabled()).toBe(undoBefore); expect(errors).toEqual([]);
});

test('basic workflow using help produces an actual standard SRT and final E', async ({ page }) => {
  await start(page); await openHelp(page, '歌詞の入力方法'); await expect(page.getByRole('region', { name: '使い方の説明' })).toContainText('字幕行を生成'); await page.getByRole('button', { name: '閉じる', exact: true }).click(); await prepare(page);
  await openHelp(page, 'R/Eキーの操作'); await expect(page.getByRole('region', { name: '使い方の説明' })).toContainText('最後の行は必ずE'); await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await stamp(page, 1, 'r'); await stamp(page, 3, 'r'); await stamp(page, 6, 'e');
  await page.getByRole('button', { name: 'SRT出力', exact: true }).click(); await page.getByLabel('出力ファイル名').fill('ガイドだけで完成.srt'); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'SRTをダウンロード', exact: true }).click(); const file = await download;
  expect(file.suggestedFilename()).toBe('ガイドだけで完成.srt'); expect(await fs.readFile((await file.path())!, 'utf8')).toBe(completedSrt);
});

test('storage restriction still allows guide exit and help reuse without a reopen loop', async ({ page }) => {
  await page.addInitScript(key => { const get = Storage.prototype.getItem, set = Storage.prototype.setItem; Storage.prototype.getItem = function (name) { if (name === key) throw new DOMException('保存禁止', 'SecurityError'); return get.call(this, name); }; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('保存禁止', 'SecurityError'); set.call(this, name, value); }; }, GUIDE_STORAGE_KEY);
  await start(page); await openHelp(page); await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(tour(page)).toHaveCount(0); await page.getByLabel('歌詞を貼り付け', { exact: true }).fill(lyrics); await expect(tour(page)).toHaveCount(0);
});

test('keyboard tooltips and destructive confirmations are accessible and cancel safely', async ({ page }) => {
  await start(page); const save = page.getByRole('button', { name: 'プロジェクト保存', exact: true }); await save.focus(); await expect(page.getByRole('tooltip')).toContainText(content.tips.save); await page.mouse.move(0, 0); await page.evaluate(() => window.dispatchEvent(new Event('scroll'))); await expect(page.getByRole('tooltip')).toContainText(content.tips.save); await expect(save).toHaveAttribute('aria-describedby', /studio-tooltip/); await page.keyboard.press('Escape'); await expect(page.getByRole('tooltip')).toHaveCount(0);
  await openHelp(page); for (let i = 0; i < 18; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement))).toBe(true); } await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: '使い方', exact: true })).toBeFocused();
  await prepare(page); await stamp(page, 1, 'r'); await stamp(page, 3, 'r'); await stamp(page, 6, 'e'); await page.getByRole('button', { name: '詳細編集', exact: true }).click();
  await page.getByRole('button', { name: '開始をクリア', exact: true }).click(); await expect(page.getByRole('dialog', { name: '開始をクリアする' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByTestId('subtitle-row-2')).toContainText('00:00:03,000');
  await page.getByRole('button', { name: '削除', exact: true }).click(); await page.getByRole('button', { name: 'キャンセル', exact: true }).click(); await expect(page.getByTestId('subtitle-row-2')).toBeVisible();
});

test('mobile tour and help keep real targets visible and page within 320/390/768 widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await openFresh(page);
  for (let step = 0; step < 5; step++) { await expect(page.getByTestId('guide-highlight')).toHaveAttribute('data-target', content.guideSteps[step].id); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); const rect = await page.getByTestId('guide-highlight').boundingBox(); expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.y).toBeGreaterThanOrEqual(0); expect(rect!.y + rect!.height).toBeLessThanOrEqual(844); if (step < 4) await tour(page).getByRole('button', { name: '次へ' }).click(); }
  await tour(page).getByRole('button', { name: '終了' }).click(); await openHelp(page);
  for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 844 }); await expect(page.getByRole('button', { name: '閉じる', exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.getByRole('navigation', { name: 'ヘルプの目次' }).getByRole('button', { name: 'よくある質問', exact: true }).click(); await page.getByText('SRTとは何ですか？', { exact: true }).click(); await expect(page.getByRole('region', { name: '使い方の説明' })).toContainText(content.faq[0].a);
});

test('shared explanations, four Markdown manuals and seven real images resolve at nested Pages path', async ({ page, request }) => {
  await start(page); await openHelp(page); await expect(page.getByRole('navigation', { name: 'ヘルプの目次' }).getByRole('button')).toHaveCount(10);
  for (const topic of content.topics) { await page.getByRole('navigation', { name: 'ヘルプの目次' }).getByRole('button', { name: topic.title, exact: true }).click(); await expect(page.getByRole('region', { name: '使い方の説明' })).toContainText(topic.paragraphs[0]); }
  for (const name of ['USER_GUIDE.md', 'QUICK_START.md', 'SHORTCUTS.md', 'FAQ.md', 'index.html']) { const response = await request.get(`manuals/${name}`); expect(response.ok()).toBe(true); expect(await response.text()).not.toContain('開発予定'); }
  for (const topic of content.topics.filter(item => item.image)) { const response = await request.get(`manuals/images/${topic.image}`); expect(response.ok()).toBe(true); expect((await response.body()).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); }
  const readme = await fs.readFile('README.md', 'utf8'); for (const name of ['USER_GUIDE.md', 'QUICK_START.md', 'SHORTCUTS.md', 'FAQ.md']) expect(readme).toContain(`](${name})`);
});

test('capture manual photos from the implemented workflow', async ({ page }) => {
  test.skip(process.env.CAPTURE_DOCS !== '1', '画面写真の更新時だけ実行します。');
  await fs.mkdir('docs/images', { recursive: true }); const photo = async (name: string) => { await page.mouse.move(0, 0); return page.screenshot({ path: `docs/images/${name}.png`, fullPage: true }); };
  await openFresh(page); await expect(page.getByTestId('guide-highlight')).toBeVisible(); await photo('01-first-guide'); await tour(page).getByRole('button', { name: 'スキップ' }).click();
  await page.getByLabel('プロジェクト', { exact: true }).fill('はじめての制作（検証用）'); await page.getByLabel('歌詞を貼り付け', { exact: true }).fill(lyrics); await photo('02-lyrics'); await page.getByRole('button', { name: '字幕行を生成', exact: true }).click();
  await page.getByLabel('音源を読み込む', { exact: true }).setInputFiles({ name: 'ガイド検証音源.wav', mimeType: 'audio/wav', buffer: wav() }); await expect(page.getByText('波形をクリックして移動。Shift＋ドラッグでループ区間を選択。')).toBeVisible(); await photo('03-audio');
  await stamp(page, 1, 'r'); await stamp(page, 3, 'r'); await stamp(page, 6, 'e'); await photo('04-timing'); await page.getByRole('button', { name: '詳細編集', exact: true }).click(); await photo('05-edit');
  await page.getByLabel('SRTを読み込む', { exact: true }).setInputFiles({ name: '既存字幕の例.srt', mimeType: 'text/plain', buffer: Buffer.from(completedSrt) }); await page.getByRole('button', { name: '置き換える', exact: true }).click(); await expect(page.getByText('Eの対象：現在選択している行', { exact: true })).toBeVisible(); await photo('06-existing');
  await page.getByRole('button', { name: 'SRT出力', exact: true }).click(); await page.getByLabel('出力ファイル名').fill('STARLIGHT MODE.srt'); await photo('07-export');
});
