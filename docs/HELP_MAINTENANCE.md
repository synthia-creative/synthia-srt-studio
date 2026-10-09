# ヘルプとマニュアルの更新

アプリ内の説明、5段階ガイド、ボタンの説明、ショートカット、FAQの正本は `src/help/content.json` です。制作機能の挙動を変えた場合は、同じ変更でこの説明も修正します。

1. 実際のボタン名・R/Eの対象・設定値と照合してJSONを変更する。
2. 画面が変わった場合は、次のコマンドで実装済みの画面を撮り直す。
3. `docs/images/` の7枚を開いて、操作箇所と説明が一致していることを確認する。
4. 説明を再生成し、一致確認と全操作テストを実行する。
5. 公開後、アプリ内ヘルプと `/manuals/` の画像表示を確認する。

```powershell
$env:CAPTURE_DOCS = '1'
npm.cmd run test:e2e -- --grep 'capture manual photos'
Remove-Item Env:CAPTURE_DOCS
npm.cmd run docs:generate
npm.cmd run docs:check
npm.cmd run test:e2e
```

`docs:generate` は4つのMarkdown、`public/manuals/index.html`、公開用のMarkdownと写真コピーを生成します。生成済みファイルを直接直さず、共通JSONと生成スクリプトを変更してください。写真はPlaywrightで実際の制作操作を行って撮影し、架空の画面を生成しません。写真内の歌詞・WAVは検証用です。

`docs:check` は共通説明と生成文書の一致、写真7枚の存在、公開用コピーとのバイト一致を検査します。GitHub Actionsもこの検査を実行します。UIとの意味上の一致は操作テストと画像の目視確認で補います。

公開後は、最新のビルドを残した状態で `node scripts/verify-public.mjs` を実行すると、distの全ファイルについてHTTP成功とSHA-256一致を検査し、`docs/qa/beginner-public-files.json` に保存します。画像がブラウザに表示されることも別途確認してください。

ガイドの既読状態は `synthia-srt-studio.guide.v1` というブラウザ設定に保存します。字幕やJSONプロジェクトの形式は変更しません。保存が制限される環境では次回起動時に再度案内しますが、同じ画面で終了直後に再表示するループはありません。
