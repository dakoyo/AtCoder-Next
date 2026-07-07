# 設定リファレンス

AtCoder Next の詳細な動作設定、設定ファイルの構造、および利用可能な環境変数の一覧を解説します。

---

## 1. ワークスペース設定 (`.atcoder-next/settings.json`)

ワークスペース初期化（`atc init`）時に作成されるメインの設定ファイルです。

### 設定項目一覧とスキーマ
設定ファイルは自動的にデータの形式チェックが行われ、破損や型エラーがあるキーは自動でデフォルト値へ変更されます。

```json
{
  "defaultLanguage": "cpp",
  "languages": {
    "cpp": {
      "extension": "cpp",
      "templateDir": "templates/cpp",
      "build": "g++ -O2 -std=gnu++20 -o a.out main.cpp",
      "run": "./a.out",
      "submitFile": "main.cpp",
      "atcoderLanguage": "",
      "atcoderLanguageIdRegex": ""
    }
  },
  "testDirName": "tests",
  "contestDir": "",
  "lang": "en",
  "extractProblemStatement": false,
  "problemLang": "ja"
}
```

* **`defaultLanguage`**: 新しい問題フォルダを作成する際にデフォルトで使用するプログラミング言語。
* **`languages`**: プログラミング言語ごとのコマンドやファイル拡張子の詳細定義。
  * **`extension`**: ソースファイルの拡張子。
  * **`templateDir`**: 初期テンプレートファイルが配置されているフォルダ名（`workspaceRoot/templates/[name]`）。
  * **`build`**: テスト実行前に走らせるローカルビルドコマンド。
  * **`run`**: 実行ファイルを実行するコマンド。
  * **`submitFile`**: 提出対象となる解答ソースコード of ファイル名。
  * **`atcoderLanguage`**: 提出時に選択する AtCoder のプログラミング言語のテキスト名（空欄の場合は自動適合されます）。
  * **`atcoderLanguageIdRegex`**: 提出時の言語要素を特定するための内部正規表現。
* **`testDirName`**: テストケースがダウンロードされるディレクトリの名前。
* **`contestDir`**: コンテストごとのフォルダ（`abc300`等）を配置する親ディレクトリ名（例: `src` にすると、`workspaceRoot/src/abc300/...` になります）。
* **`lang`**: CLIの表示言語（`ja` または `en`）。
* **`extractProblemStatement`**: 問題フォルダ作成時に問題文 (`problem.md`) を自動抽出するかどうか。
* **`problemLang`**: 自動抽出する問題文の優先言語（`ja` または `en`）。

---

## 2. 環境変数リファレンス

AtCoder Next では、コマンドの実行時に環境変数を指定することで、CLIの挙動をカスタマイズまたは制御することができます。

### 環境変数の設定方法

#### 一時的に実行時のみ適用する場合 (Linux / macOS)
コマンドの先頭に変数を記述して実行します。
```bash
ATC_YES=true atc init
```

#### 一時的に実行時のみ適用する場合 (Windows PowerShell)
コマンド実行の前に環境変数をセットします。
```powershell
$env:ATC_YES="true"
atc init
```

#### システムまたはシェル全体に永続的に適用する場合 (Linux / macOS)
`~/.zshrc` や `~/.bashrc` などのシェル設定ファイルに以下を追記します。
```bash
export ATC_YES=true
```

---

### 利用可能な環境変数と詳細

#### `ATC_YES`
- **値の指定**: `true`
- **詳細な動作**: 対話型の確認プロンプトをすべてスキップし、デフォルト値の選択や「はい」の回答を選択したとみなして処理を自動進行します。また、`atc submit` 実行時にローカルテストが失敗している場合でも、提出確認プロンプトを出さずに AtCoder へコードを提出します。
- **主な用途**: GitHub Actions などの CI/CD 環境での自動テストや自動提出スクリプトでの実行。

#### `ATC_NON_INTERACTIVE`
- **値の指定**: `true`
- **詳細な動作**: `true` に設定されている場合、対話型プロンプト（`@clack/prompts`）の入力を完全に無効化します。プロンプトが表示されるはずの処理を実行すると、確認を行わずにエラー終了するか、あるいは非対話環境用のデフォルト動作に強制的に倒されます。
- **主な用途**: TTYの自動検出が正しく機能しない一部のコンテナ環境や自動化スクリプトで、入力待ちによるハングアップを確実に防ぎたい場合。

#### `ATC_DEBUG`
- **値の指定**: `true`
- **詳細な動作**: エラー発生時のログ出力を詳細化します。通常は省略される JavaScript のコールスタック（スタックトレース）が標準エラー出力にすべて出力されるようになります。
- **主な用途**: ツールの動作に異常が発生した場合のデバッグや、不具合報告用のログを収集したい場合。

#### `ATC_EXEC_WRAPPER`
- **値の指定**: 実行コマンドのプレフィックスとなる文字列（例: `docker run --rm -v ...` などのコマンド）
- **詳細な動作**: `atc test` などのローカル実行において、`settings.json` で定義されている `build` コマンドおよび `run` コマンドの先頭に、この環境変数の値をプレフィックスとして自動的に付加します。
- **設定例と動作**:
  以下のように環境変数を指定して実行します。
  ```bash
  ATC_EXEC_WRAPPER="docker run --rm -v $(pwd):/workspace -w /workspace compiler-image" atc test
  ```
  これにより、`settings.json` の `run` コマンドが `./a.out` であった場合、実際に実行されるコマンドは自動的に以下のように拡張されます。
  ```bash
  docker run --rm -v $(pwd):/workspace -w /workspace compiler-image ./a.out
  ```
- **主な用途**: ローカルマシンのネイティブ環境を汚さずに、Docker コンテナなどの隔離された環境で安全に解答プログラムをビルド・実行させたい場合。
