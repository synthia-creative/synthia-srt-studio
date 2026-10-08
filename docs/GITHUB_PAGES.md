# GitHub Pages 公開手順

2026-10-08、利用者の「GitHub公開して」という依頼に基づいて、専用の公開リポジトリ [synthia-creative/synthia-srt-studio](https://github.com/synthia-creative/synthia-srt-studio) を作成し、ソースを `main` へ登録しました。PagesのSourceは「GitHub Actions」です。

公開URL：[https://synthia-creative.github.io/synthia-srt-studio/](https://synthia-creative.github.io/synthia-srt-studio/)

初回公開は [Publish GitHub Pages #1](https://github.com/synthia-creative/synthia-srt-studio/actions/runs/37720393805) で成功しました。公開コードのSHAは `762613f0c11180e194bd713d74379c76b9a23fbe`。build 52秒、deploy 10秒、全体1分13秒。後続のコミットは公開記録・スクリーンショット・説明文の更新のみで、アプリのコードやビルド設定は同一です。

更新・再公開の手順：

1. この専用リポジトリ内で変更し、ローカルの型検査・単体・E2Eを確認する。
2. `origin` の `main` へコミットをpushする。既存の別プロジェクトのremoteを流用しない。
3. リポジトリのSettings → Pages → Sourceで「GitHub Actions」を選ぶ。
4. Actionsの「Publish GitHub Pages」を **Run workflow** で手動実行する。
5. ワークフロー内の単体テスト・ビルド・E2E成功後にdistが公開される。
6. 実公開URLでCSS／JS／ライセンス、音源選択、ダウンロード、モバイルを再確認する。

自動push公開は設定していません。ワークフローは `workflow_dispatch` 専用です。GitHub Pages環境への承認ルールは必要に応じてリポジトリ側で設定できます。

設定は[GitHubのカスタムPagesワークフロー公式資料](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)と[setup-nodeの公式README](https://github.com/actions/setup-node)を2026-10-08に確認して作成しました。checkout@v6、setup-node@v6、configure-pages@v5、upload-pages-artifact@v4、deploy-pages@v4を指定しています。

`base: './'` によりdist内の参照は相対パスです。ローカルE2Eと公開URLの双方で `/synthia-srt-studio/` 以下を確認しました。公開HTML・JS・CSS・ライセンス2ファイルはすべてHTTP 200で、ローカルdistとSHA-256が一致しました。

初回Actionsには、GitHub提供のPagesアクションがNode.js 20指定から24へ強制移行される警告と、ubuntu-latest移行予定の通知がありました。テスト・ビルド・配信は成功しています。将来ワークフローを更新する際は、公式アクションの対応版と実行結果を確認してください。
