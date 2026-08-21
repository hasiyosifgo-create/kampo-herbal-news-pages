# Antirgravity新規構築用の移植パッケージ

このディレクトリは、既存の漢方・生薬ニュースサイトを **Google Antigravity** でゼロから再構築するための引継ぎ情報です。記事データ、会員企業情報源、分類基準、収集方針を一つの再利用可能なパッケージとして定義しています。

| 移植対象 | 参照元 | 用途 |
|---|---|---|
| 初期ニュース | `../docs/data/news.json` | 一覧画面・カテゴリ・既読表示の初期データ |
| 会員企業情報源 | `../member-sources.txt` | 日漢協会員55社の公式情報監視対象 |
| 収集・分類ロジック | `../scripts/github-pages-crawl.mjs` | 3分割確認、関連性判定、重複回避、JSON更新 |
| 移植仕様 | `migration-manifest.json` | データスキーマ、分類、表示、保持期間の契約 |
| 実装指示 | `BUILD_PROMPT.md` | Antigravityエージェントへの入力用仕様 |

## Antigravityでの開始手順

Antigravityでは、左サイドバーのフォルダ追加から新規プロジェクトを作成し、ローカルフォルダまたはGitリポジトリを追加できます。そのため、このリポジトリをローカルへクローンしてから、フォルダを新規プロジェクトに関連付けます。[1] [2]

```bash
git clone https://github.com/hasiyosifgo-create/kampo-herbal-news-pages.git
cd kampo-herbal-news-pages
```

次に、Antigravityで **New Project → Add Folder** を選択して、上記フォルダを追加します。初回のエージェント起動は、既存ファイルを直接編集する **Local Mode** を選び、`BUILD_PROMPT.md` の内容をそのまま渡してください。[1]

## データ移管の原則

> **公式URLを記事の主キーとし、発売日が明確に取れない場合は公式告知日を表示する。**

このルールにより、URLの取得日時や推定日を発売日として誤表示せず、公式情報へのリンクを常に残します。既読状態は個人情報を伴わないブラウザ内データとして実装してください。

## 参考文献

[1] [Google Antigravity Docs: Getting Started with Antigravity 2.0](https://antigravity.google/docs/getting-started/)

[2] [Google Antigravity Docs: Projects](https://antigravity.google/docs/projects/)
