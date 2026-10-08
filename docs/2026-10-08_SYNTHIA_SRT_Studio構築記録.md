---
source: chatgpt
date: 2026-10-08
category: プログラミング
tags:
  - chatgpt/log
  - synthia
  - srt
  - react
summary: 独立した歌詞SRT編集アプリを構築し、手動入力・保存復元・波形・出力をローカルで検証した。
---

# SYNTHIA SRT Studio v1.0の構築とローカル検証

## 概要・要点
- 新規フォルダと独立Gitリポジトリに、React＋TypeScript＋Viteのブラウザ内SRT制作アプリを構築した。
- 共通エンジンの整数ミリ秒管理、互換キー操作、波形・ループ、標準SRT出力、JSON・IndexedDB復元を実装した。
- TypeScriptとビルド、Vitest56件、Playwright E2E12件が成功した。PC・タブレット・スマホ幅の画面を確認した。
- 原本と既存SYNTHIAプロジェクトを保護した。GitHub作成・push・公開は、ローカル確認後の別途承認対象として未実施。

## 対話ログ

### 依頼
利用者は「SYNTHIA SRT Studio v1.0 完全構築指示書」を提示。SRT Tap Timerの操作との互換性を重視し、歌詞貼付けからタイミング入力、検証、SRT出力までの独立Webアプリを求めた。AIは未実装とし、将来の拡張用インターフェースだけを設計する条件だった。

### Skillの選択と画面設計
実際のSkillファイルを確認し、frontend-design、frontend-app-builder、ui-ux-pro-maxの違いを提示した。利用者はfrontend-designを選択した。ネイビー・黒・白を基調とし、シアンで再生位置と選択行を示す構成を採用した。PCは上部に音源、下段に歌詞と字幕、狭い画面はパネル切替とした。

### 参考アプリの調査
cityedge/srt-tap-timer v1.64.2のREADME、USER_GUIDE、CHANGELOG、index.html、LICENSEを読み、調査用コピーとSHA-256を新規プロジェクト内に保存した。R/E/W、Shift操作、Undo前の時刻捕捉、未完成記号、波形、SRT・JSON処理を分析した。MIT完全文・帰属コメント・配布用第三者表記を保持した。

### 実装
字幕操作を共通エンジンに集約し、不正な編集は原子的に拒否した。終了時刻を消さず、未設定はnull、時刻は整数msとした。SRTは不完全行を検証一覧に表示して出力停止し、重複は警告として扱った。JSONを構造検証してから復元し、音源再選択を案内した。IndexedDB下書きは明示的なJSON復元と区別した。

### 検証と修正
実WAVを用いたブラウザ検証で、1234ms入力、最終行の終了、Undo/Redo、ダウンロード名・内容、保存位置への復帰、下書き復元を確認した。設定項目の明示ラベル、スマホ目盛り、PCの画面内配置、選択行表示を修正した。波形失敗時の再生・入力継続と実ループ再生も確認し、単体56件・E2E12件が成功した。

### 納品・未確認事項
ソース、README、ARCHITECTURE、AI_EXTENSION_SPEC、操作マニュアル、テスト、MIT関連ファイル、GitHub Pages手動公開設定を作成した。ローカルプレビューを起動した。GitHub公開、実端末、他ブラウザ、実OSの日本語IME操作、実曲MP3・長時間音源の検証は未実施である。

静的ビルドZIPとソースZIPも納品した。独立Gitはmainで初期化済み、remoteなし。Git作成者情報が未設定のため初回コミットは作成せず、ファイルをステージ済みとした。既存ユーザー設定を変更しなかった。

### 成果物
プロジェクト：`projects/synthia-srt-studio`。詳しい結果は同フォルダの `docs/QA_REPORT.md`、起動方法は `README.md`、操作は `USER_GUIDE.md` を参照。
