# SYNTHIA SRT Studio v1.0 検証報告

2026-10-09追加分の最新結果は [初心者ガイド・ヘルプ検証報告](BEGINNER_HELP_QA.md) を参照してください。以下は2026-10-08の初回構築・公開時の記録です。

検証日：2026-10-08。新規の独立フォルダ内で実施。既存SYNTHIA Lyrics Studio、Layer Studio、SRT Tap Timer原本へ編集・依存インストール・Git操作を行っていません。

## 実行結果

| 確認 | 結果 |
| --- | --- |
| `npm.cmd run typecheck` | 成功。最終E2E前のbuildにも含めて実行 |
| `npm.cmd test` | **3ファイル / 56件成功** |
| `npm.cmd run build` | 成功。46モジュール、CSS約17.88kB、JS約275.82kB（gzip約86.33kB） |
| `npm.cmd run test:e2e` | **12件成功**、約30.9秒。ビルド成果物を使って検証 |
| PC表示 | 1440×1000。音源・歌詞・字幕・選択行エディターが同じ画面内。選択行は内部スクロールで表示 |
| タブレット表示 | 768×1024。パネル切替、ページ全体の横はみ出しなし |
| スマホ表示 | 390×844。パネル切替、目盛り間隔調整、一覧内部の横スクロール |
| ブラウザコンソール | 主要制作E2Eでpageerrorなし |
| GitHub Pages相当サブパス | `/synthia-srt-studio/` で実ビルドのHTML・JS・CSS・MIT表記を読み込み成功 |
| ローカル開発起動 | Viteを `http://127.0.0.1:5186/` で起動 |
| 独立Git | 専用の `origin` を設定し、`main` を `synthia-creative/synthia-srt-studio` へpush済み。作成者はコマンド単位指定 |
| GitHub Actions | 初回公開 #1で単体56件・E2E12件、型検査、build、deployが成功 |
| 公開ファイル | HTML・JS・CSS・ライセンス2ファイルがHTTP 200、SHA-256はローカルdistと全件一致 |
| 公開Chrome操作 | WAVの再生・8秒終端、波形、日本語／英語2行の生成、手動時刻編集、標準SRTダウンロードを確認 |
| 公開表示 | Chromeで1440×1000／768×1024／390×844、全体の横はみ出しなし。スマホの歌詞パネル切替も確認 |

Windows 11 / Node.js 24.19.0 / React 19.3.0 / TypeScript 5.9.3 / Vite 7.3.7 / Vitest 3.2.7 / Playwright 1.64.0。npmの解決版は `package-lock.json` で固定しています。Playwrightは既存Microsoft Edge（Chromium）を使用しました。既存環境へブラウザを追加インストールしていません。

## 要求項目との対応

| 項目 | 証拠 |
| --- | --- |
| 日本語・英語・混在歌詞、TXT読込 | 歌詞単体テスト＋日本語UTF-8 TXTの実読込E2E |
| Sunoタグ、空白、繰り返し | 単体テストで原文・区切り・反復を確認。タグの出力除外を実SRTでも確認 |
| R/Eの精度 | 実WAVのaudio.currentTimeを1.234秒等にシークし、書き出したSRTの1234msを確認 |
| Shift系 | 単体・E2EでShift＋RとShift＋E両対象、W補正、Shift＋矢印を確認 |
| 最終行終了 | 最後のR→Eで終端4500msの標準SRTをダウンロードして確認 |
| 手動時刻・本文変更 | E2Eで開始950ms、終了2100ms、空白入り日本語を反映・出力 |
| 終了保護 | 既存終了を越える開始を原子的に拒否し、元の時刻・履歴を保持 |
| 重複・丸め | 非隣接重複、等しい境界、59.9996秒→60000ms、1.9999999秒→2000msを確認 |
| 未完成SRT | 元記号をnullへ変換、出力停止、検証一覧から該当行への移動 |
| 完成SRT往復 | ミリ秒と本文（複数行・前後空白を含む）の意味上の同一性を確認 |
| JSON保存・復元 | ダウンロードJSONを再読込。字幕・ID・セクション・設定・位置・フラグを確認 |
| 音源未選択時の復元 | 音源なしJSONの復元と案内。音源ありJSONは再選択後1250msへ復帰 |
| Undo/Redo | 最終終了の取り消し／復帰、境界など複合操作、並び替え・削除・追加 |
| IME・入力欄・長押し・モーダル | 入力フォーカス、isComposing、229、repeat、モーダル操作を検証。compositionイベントも監視 |
| 複数選択・一括シフト・境界・ロック | UIとエンジンで変更・拒否・Undoを確認 |
| 再生・速度・ズーム・ループ | 実WAV再生、0.5倍のaudio.playbackRate、選択区間、ループ外からの巻戻し |
| 波形失敗時 | ブラウザでdecodeAudioDataを意図的に失敗させ、音源再生と1234msのR入力が継続することを確認 |
| 大容量音源 | 64MiB／10分超のガードと事前キャンセルを単体テストで確認 |
| IndexedDB下書き | 自動保存表示後にリロードし、復元ダイアログから実復元 |
| 将来候補設計 | 候補分離、確認／ロック保護、明示承認、元時刻へUndo、拒否を単体テスト |
| ファイル名・BOM | `STARLIGHT MODE.srt` がそのままダウンロード名。BOM・標準時刻の単体テスト |
| MIT | 本文・ライセンスをdistへ同梱し、サブパスから原作者表記を取得できることを確認 |

## 画面証拠

テスト用の8秒WAV（生成したサイン波）と短い検証用歌詞を使用しています。実際の曲・成果作品ではありません。

- `docs/qa/desktop.png`
- `docs/qa/tablet.png`
- `docs/qa/mobile.png`

各画像を実際に開いて、目盛り・配色・パネル配置・時刻表示・選択行を確認しました。

納品ZIPは `releases/SYNTHIA-SRT-Studio-v1.0.0-static.zip` と `releases/SYNTHIA-SRT-Studio-v1.0.0-source.zip`。静的ZIPはdist一式、ローカル納品用ソースZIPはGitツリーから生成しています。GitHubからはmainのソースZIPを取得できます。既存Git設定へ作成者情報を追加していません。

公開後の画面証拠は `docs/qa/public-desktop.jpg`、`public-tablet.jpg`、`public-mobile.jpg`、`github-pages-success.jpg`。検証用の生成サイン波と歌詞を使用しています。公開Chromeのerror／warnログは空でした。出力した `SYNTHIA-public-check.srt` の2行は、1000→2000ms、3000→4000ms、本文も入力と一致し、セクションタグは除外されていました。

公開コードSHA：`762613f0c11180e194bd713d74379c76b9a23fbe`。[Actions #1](https://github.com/synthia-creative/synthia-srt-studio/actions/runs/37720393805) はSuccess、build 52秒／deploy 10秒。公開コードと、その後に追加する記録・説明のコミットを区別しています。

## 修正した問題

- 設定selectのアクセシブル名を明示し、テストと利用者が項目を正確に識別できるよう修正。
- スマホの波形目盛りが重ならないよう幅に応じて目盛り数を変更。
- PCの画面内に各エリアを配分し、詳細編集切替・サイズ変更時に選択行を表示。
- 波形読込イベントの再登録で非同期結果が破棄される状態を修正。
- 本文内の空行による標準SRT再読込時の欠落を防ぐため出力時に検証。

## 未検証の境界

GitHubリポジトリ作成・push・Actions・Pages公開・公開URLのChrome操作まで確認済みです。CIの12件はrunner上のビルド配信サーバーで実行し、公開URLでは上記の主要操作を別途確認しました。

Safari・Firefox、実スマートフォン／タブレット、実OSの日本語IME操作、実曲MP3・長時間音源の再生とデコードは未実施です。今回のブラウザ証拠はローカルWindows Edge、CIのChromium、公開URLのWindows Chrome、生成WAV、合成IMEイベント、エミュレーション画面幅です。オフセットの個人差・音響遅延の実測や演奏との同期精度は自動テストでは保証しません。

自動下書きはブラウザ保存容量・利用者設定・終了タイミングに依存し、終了時の保存完了や端末間同期は保証しません。JSON保存を併用してください。AIは契約とレビュー操作だけで、モデル・外部API・自動同期は実装も検証もしていません。
