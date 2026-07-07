# AtCoder Next

AtCoder Nextは、AtCoderでの競技プログラミングを支援するコマンドラインツールです。
プロジェクトの初期化、テストケースのダウンロード、テスト実行、コード提出、およびコンパイラ環境の診断・インストールなどのワークフローをローカル環境で自動化します。

![AtCoder Next Demo](docs/media/vhs/ja.gif)

## 主な機能

- **ローカルでのテスト実行**: esbuildを用いたインプロセスビルドや、ダウンロードしたテスト実行制限時間のキャッシュ、指数バックオフを導入したポーリングによるジャッジ状況取得などを備えています。
- **コードのバンドル**: 依存ファイル（C++, Python, Rust, JavaScript, TypeScript）を提出用に単一のファイルへマージします。セキュリティ上の対策として、ワークスペース外のファイルを読み込まないパス検証機能を備えています。
- **環境診断と自動セットアップ (`doctor` / `setup`)**: ローカル環境のコンパイラとAtCoderの公式ジャッジ環境のバージョン差分を検出し、必要に応じて自動インストールを行います。
- **セッションの保護**: セッションCookieや暗号キーをAES-256-CBCで暗号化し、パーミッション `0o600` でローカルに保存します。

---

## インストール

Node.js (v18以上) がインストールされた環境で以下を実行してください。

```bash
npm install -g atcoder-next
```

---

## はじめかた (クイックスタート)

```bash
# 1. ワークスペース of 初期化
atc init

# 2. AtCoder へのログイン
atc login

# 3. コンテスト abc300 のセットアップ
atc new abc300

# 4. ディレクトリに移動し、コードを書いてテスト・提出
cd abc300/a
atc test     # エイリアス: atc t
atc submit   # エイリアス: atc s
```

---

## ドキュメント

詳細な使用方法や設定項目については、[公式ドキュメントサイト](https://dakoyo.github.io/AtCoder-Next/) または以下のファイルを参照してください。

* [クイックスタート](docs/ja/quickstart.md)
* [基本的な使い方 (ログイン・テスト・提出)](docs/ja/usage.md)
* [表示言語とプログラミング言語の設定](docs/ja/languages.md)
* [テンプレートのカスタマイズ](docs/ja/templates.md)
* [環境診断・自動セットアップ・コードのバンドル](docs/ja/tools.md)
* [設定ファイルの解説 (settings.json & 環境変数)](docs/ja/configuration.md)
* [トラブルシューティング](docs/ja/troubleshooting.md)
* [システム内部仕様](docs/ja/internals.md)

---

## ガイドライン

AtCoderの利用規約を遵守し、著作権上のトラブルを回避するために以下の点に留意してください。

* **開催中のコンテスト**: 開催中のコンテストでは、問題文のMarkdown抽出機能は自動的に無効化されます。この制限を意図的に回避しないでください。
* **ソースコードと問題文の公開制限**: 抽出した問題文（`problem.md`）を含むフォルダを、GitHubのパブリックリポジトリなどの一般にアクセス可能な場所に公開・共有しないでください。

## ライセンス

ライセンスの詳細は [LICENSE](LICENSE) を参照してください。本プロジェクトは、[online-judge-tools/oj](https://github.com/online-judge-tools/oj) および [Tatamo/atcoder-cli](https://github.com/Tatamo/atcoder-cli) の設計を参考に開発されています。