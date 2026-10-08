---
source: chatgpt
date: 2026-10-08
category: プログラミング
tags:
  - chatgpt/log
  - synthia
  - github
  - srt
summary: SYNTHIA SRT StudioをGitHubとPagesへ公開し、CIと公開画面の主要操作を確認した。
---

# SYNTHIA SRT StudioのGitHub公開と動作確認

## 概要・要点
- 利用者の「GitHub公開して」という依頼に基づき、専用の公開リポジトリとGitHub Pagesを作成した。
- GitHub Actionsの単体56件・E2E12件が成功。公開URLでも音源再生・波形・字幕編集・SRT出力、3画面幅を確認した。
- 既存のSYNTHIAプロジェクトやGitユーザー設定への変更は行わず、新しいプロジェクトに専用remoteを設定した。

## 対話ログ

### 制作から公開への依頼
利用者は制作Skillとしてfrontend-designを選択し、SYNTHIA SRT Studio v1.0を構築した。ローカルで56件の単体テスト、12件のE2E、型検査・ビルドを確認した後、GitHub公開を依頼した。

### 公開先
- [アプリを開く](https://synthia-creative.github.io/synthia-srt-studio/)
- [公開リポジトリ](https://github.com/synthia-creative/synthia-srt-studio)
- [成功した初回公開ワークフロー](https://github.com/synthia-creative/synthia-srt-studio/actions/runs/37720393805)
- 公開コードSHA：`762613f0c11180e194bd713d74379c76b9a23fbe`

認証済みChrome画面で新規リポジトリをPublicとして作成し、独立Gitからソース・テスト・説明資料をpushした。PagesのSourceをGitHub Actionsに設定し、「Publish GitHub Pages」をmainで手動実行した。Git作成者は、このリポジトリの初期コミット情報をコマンド単位で引き継いだ。

### 検証結果
Actions #1はSuccess。build 52秒、deploy 10秒、全体1分13秒。公開HTML・JS・CSS・MITライセンスと第三者表記はHTTP 200で、ローカルdistとSHA-256が全件一致した。

公開Chromeでは、生成した8秒のWAVを読み込み、再生が終端へ進み、波形が表示されることを確認した。日本語・英語の検証用歌詞を2行へ生成し、1行目1000→2000ms、2行目3000→4000msとして編集した。ダウンロードした `SYNTHIA-public-check.srt` を読み取り、時刻・本文・タグ除外が一致することを確認した。公開ページのerror／warnログは空だった。

PC 1440×1000、タブレット768×1024、スマホ390×844で画面を確認した。ページ全体の横はみ出しはなく、スマホの歌詞パネル切替も動作した。スクリーンショットは `docs/qa/public-desktop.jpg`、`public-tablet.jpg`、`public-mobile.jpg`、`github-pages-success.jpg` に保存した。検証後はブラウザの画面幅指定を解除した。

### 更新方法と検証の範囲
公開は手動実行専用。アプリを変更した際はmainへpushし、ActionsのRun workflowを実行する。今回、公開成功後の変更は説明資料・会話記録・画面証拠のみで、公開済みアプリのコードやビルド設定は同一である。

GitHub提供アクションのNode.jsランタイム移行警告とubuntu-latest移行予定の通知は出たが、テスト・配信は成功した。Safari、Firefox、実スマートフォン／タブレット、実曲MP3、実OSのIME入力や実測の音響遅延は未検証である。
