# GitHub Pages 公開手順

ローカル成果物の確認後、GitHubの新規リポジトリ作成・push・公開は別途利用者の承認を得て実施します。現時点では未公開です。

承認後の手順：

1. 利用者が指定したアカウント・名前・公開範囲で新しいリポジトリを作成する。
2. この独立Gitリポジトリに新規remoteを設定してpushする。既存リポジトリのremoteを流用しない。
3. リポジトリのSettings → Pages → Sourceで「GitHub Actions」を選ぶ。
4. Actionsの「Publish GitHub Pages」を **Run workflow** で手動実行する。
5. ワークフロー内の単体テスト・ビルド・E2E成功後にdistが公開される。
6. 実公開URLでCSS／JS／ライセンス、音源選択、ダウンロード、モバイルを再確認する。

自動push公開は設定していません。ワークフローは `workflow_dispatch` 専用です。GitHub Pages環境への承認ルールは必要に応じてリポジトリ側で設定できます。

設定は[GitHubのカスタムPagesワークフロー公式資料](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)と[setup-nodeの公式README](https://github.com/actions/setup-node)を2026-10-08に確認して作成しました。checkout@v6、setup-node@v6、configure-pages@v5、upload-pages-artifact@v4、deploy-pages@v4を指定しています。GitHub側での実行は未検証です。

`base: './'` によりdist内の参照は相対パスです。通常の `https://USER.github.io/REPOSITORY/` のようなサブパスへ配置可能です。ローカルE2Eでも `/synthia-srt-studio/` 以下に実ビルドを置いて確認します。ただしローカルでのパス確認は、GitHub上の公開・権限・配信動作の証明ではありません。
