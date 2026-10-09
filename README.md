# SYNTHIA SRT Studio v1.0

楽曲の歌詞を聴きながらR/Eで時刻を入力し、編集・検証・SRT出力まで行う独立Webアプリです。React＋TypeScript＋Viteで構築。音源・歌詞・字幕はブラウザ内で処理し、API通信・クラウドアップロード・AI同期は実装していません。

**[SYNTHIA SRT Studioを開く](https://synthia-creative.github.io/synthia-srt-studio/)**

2026-10-08公開。GitHub Actionsで単体56件・E2E12件が成功し、公開URLで音源再生・波形・字幕編集・SRTダウンロードとPC／タブレット／スマホ幅の表示を確認しています。

2026-10-09に初心者向けガイド・ヘルプと画像付きマニュアルを追加。ローカルでは単体56件、制作・ヘルプのE2E19件、実画面撮影1件、説明と画像の一致検査が成功しています。更新の検証記録は [初心者ヘルプ検証報告](docs/BEGINNER_HELP_QA.md) にまとめています。

## ローカル起動（Windows / PowerShell）

Node.js 22.12以上（この環境では24.19.0）を使用します。

```powershell
cd "C:\Users\n-sup\Documents\Codex\Obsidian\company\game\projects\synthia-srt-studio"
npm.cmd ci
npm.cmd run dev
```

[http://127.0.0.1:5186](http://127.0.0.1:5186) を開いてください。

macOS/Linuxでは `npm.cmd` を `npm` に読み替えてください。依存関係はこのフォルダの `node_modules` のみに保存されます。

## 基本操作

初回は5段階の「はじめての使い方」が開きます。途中で終了しても、ヘッダーの「使い方」からいつでも再表示できます。ヘルプを開いても編集中の内容は保持され、案内中は制作ショートカットが停止します。

1. 歌詞を貼り付けるかTXTを読み込み、「字幕行を生成」を押す。
2. MP3/WAVを読み込み、音源を再生する。
3. 歌い出しで **R** を押す。選択が次の行へ進む。
4. 連続字幕では次のRが前行の終了を設定する。無音を空けたい場合はその前に **E** で終了する。
5. **最後の字幕はEで終了する。** 個別終了モードでは各行をEで終了する。
6. 歌詞や時刻を修正し、検証結果から問題の行へ移動する。
7. 「SRT出力」で任意のファイル名を指定し、ダウンロードする。

途中作業は「プロジェクト保存」で `曲名.synthia-srt.json` を保存してください。音源は含まれません。IndexedDBの自動下書きはそのブラウザ専用で、JSONによる明示保存とは別です。

## 主な機能

- 日本語・英語・混在歌詞、Sunoセクションタグ、原文・空白・繰り返しの保持
- R/E/W、Shift＋R/W/E、Z、Ctrl＋Z/Y/Shift＋Z、矢印操作、IME・入力欄保護
- シンプル／詳細編集、手動時刻編集、±10/100/1000ms、複数行シフト、境界合わせ、行編集、Undo/Redo
- HTMLAudioElementの再生・シーク・0.5〜1.5倍速、Web Audio波形、拡大、区間ループ
- 標準・未完成SRTの読み込み、UTF-8／BOM出力、重複警告、未完成・不正字幕の出力停止
- JSON保存・検証付き復元、音源の再選択と保存位置への復帰、IndexedDB自動下書き
- ロック・手動確認フラグ、将来の候補推定用インターフェース（モデルや推論処理なし）
- 初回ガイド、10項目のアプリ内ヘルプ、日本語ツールチップ、時刻クリア・行削除の確認表示

## 検証

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run docs:check
```

Windowsでは既存のMicrosoft EdgeをPlaywrightで使います。LinuxのCIでは事前に `npx playwright install --with-deps chromium` を実行してください。WindowsでPlaywright Chromiumを使う場合は、事前にブラウザを用意して `$env:BROWSER_CHANNEL = 'chromium'` を設定します。

E2Eはビルド成果物を `/synthia-srt-studio/` に配置したローカルサーバー（5187番）で実行します。実WAVの再生・波形解析、キーボード、ダウンロード内容、JSON・IndexedDB復元、レスポンシブ表示を検証します。

## GitHub Pages

`vite.config.ts` は `base: './'`。ビルド成果物は `dist/` で、リポジトリのサブパスへ配置可能です。`.github/workflows/pages.yml` は手動実行専用です。

公開リポジトリは [synthia-creative/synthia-srt-studio](https://github.com/synthia-creative/synthia-srt-studio) です。Pagesの配信元はGitHub Actionsに設定済みです。再公開の手順は [GITHUB_PAGES.md](docs/GITHUB_PAGES.md) を参照してください。

## 注意点

- 音源の対応形式はブラウザのデコーダーに依存します。
- メモリ負荷を抑えるため、64MiB／10分を超える音源は波形解析を省略します。音源再生と字幕編集は継続できます。
- 自動保存はブラウザの容量・設定に依存します。永続的なバックアップにはJSONを使ってください。
- 時刻を逆転させる編集は拒否します。既存の終了時刻を消すことはありません。
- 重複・行順は警告として出力可能。未設定・逆転・空本文は出力不可。
- モバイルはパネル切替とタップボタンで操作します。キーボードショートカットには物理キーボードが必要です。

## ドキュメント

`releases/SYNTHIA-SRT-Studio-v1.0.0-static.zip` はGitHub Pages等へ配置する静的ビルド一式です。ソースは [mainのZIP](https://github.com/synthia-creative/synthia-srt-studio/archive/refs/heads/main.zip) から取得できます。ローカル納品用の `releases/SYNTHIA-SRT-Studio-v1.0.0-source.zip` も作成しています（GitHubには登録しません）。node_modules、.git、生成テストレポートは含みません。ZIP内のindex.htmlをダブルクリックせず、HTTPサーバーから開いてください。

独立Gitリポジトリの `main` は専用の `origin`（上記リポジトリ）へ登録済みです。コミットの作成者情報は新規リポジトリの初期コミットから引き継ぎ、コマンド単位で指定しています。既存のGitユーザー設定は変更していません。

- [初心者向け完全マニュアル](USER_GUIDE.md)
- [最短操作ガイド](QUICK_START.md)
- [ショートカット一覧](SHORTCUTS.md)
- [よくある質問・トラブル対処](FAQ.md)
- [画像付きWebマニュアル](https://synthia-creative.github.io/synthia-srt-studio/manuals/)
- [ヘルプとマニュアルの更新手順](docs/HELP_MAINTENANCE.md)
- [設計](ARCHITECTURE.md)
- [AI拡張仕様](AI_EXTENSION_SPEC.md)
- [参考アプリ調査](docs/UPSTREAM_REVIEW.md)
- [検証報告](docs/QA_REPORT.md)
- [公開記録・会話まとめ](docs/2026-10-08_SYNTHIA_SRT_Studio公開記録.md)
- [ライセンス・第三者表記](THIRD_PARTY_NOTICES.md)

SRT Tap Timer v1.64.2（Copyright © 2026 cityedge / MIT）を参考にしています。元リポジトリを変更せず、互換操作の一部を整数ミリ秒のエンジンとして再実装しました。原作者の完全なMITライセンスとReactのライセンスはビルド成果物にも含めています。
