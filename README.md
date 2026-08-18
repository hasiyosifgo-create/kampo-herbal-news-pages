# 漢方・生薬ニュース — GitHub Pages版

このリポジトリは、GitHub Pagesで配信する静的ニュースサイトです。実行時にサーバーやデータベースを必要とせず、ニュースデータはGitHub Actionsが静的JSONとして生成します。

## 更新方法

GitHub Actionsは5分間隔（`*/5 * * * *`）で実行されます。GitHub Actionsのスケジュール実行は遅延・欠落する可能性があるため、正確なリアルタイム処理や常駐実行を保証するものではありません。各実行では日漢協会員企業を3グループに分けて1グループを確認し、3回の実行で55社を1巡します。

| 役割 | 実装 |
|---|---|
| 表示 | `docs/` のHTML・CSS・JavaScript |
| ニュースデータ | `docs/data/news.json` |
| 収集 | `scripts/github-pages-crawl.mjs` |
| 自動更新・公開 | `.github/workflows/refresh-and-deploy.yml` |

既読状態はブラウザの `localStorage` に保存されます。そのため、端末・ブラウザごとに状態が分かれ、アカウント情報や外部DBを必要としません。

## GitHub Pagesの有効化

リポジトリの **Settings → Pages → Build and deployment → Source** で **Deploy from a branch** を選び、`main` ブランチの `/docs` を指定してください。初回公開後は、`https://hasiyosifgo-create.github.io/kampo-herbal-news-pages/` で閲覧できます。

## 情報源

対象企業は日本漢方生薬製剤協会の会員名簿を基準とします。公式告知が継続取得できない企業はPMDA補完監視として扱います。

- [日本漢方生薬製剤協会：会員会社一覧](https://www.nikkankyo.org/guide/guide6.htm)
- [PMDA：医薬品回収情報](https://www.pmda.go.jp/safety/info-services/drugs/calling-attention/recall-info/0002.html)
