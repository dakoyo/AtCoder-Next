# 拡張ツール

AtCoder Next が提供する高度な開発支援機能（ツールチェインの診断、インストール、コードのバンドル）について解説します。

---

## 1. 診断とツールチェーンセットアップ (`doctor` / `setup`)

ローカルのコンパイラやランタイムのバージョンを、AtCoder の公式ジャッジ環境のバージョンに自動で適合させます。

```bash
# ローカル環境の診断
atc tools doctor

# 足りないツールの自動インストールと設定
atc tools setup
```
- エイリアス **`atc tl`** も使用可能です。

### 対応OSと使用するパッケージマネージャ
`doctor` / `setup` は動作環境（OS）を自動検出し、以下のパッケージマネージャ等を活用して不足しているツールのインストールを実行します。

| OS | パッケージマネージャ | 専用バージョンマネージャ | 対象ツールチェイン |
| :--- | :--- | :--- | :--- |
| **macOS** | Homebrew (`brew`) | `rustup`, `pyenv`, `nvm` | gcc, clang, python, node, typescript, rust |
| **Linux (Ubuntu/Debian)** | `apt` | `rustup`, `pyenv`, `nvm` | gcc, clang, python, node, typescript, rust |
| **Linux (Fedora/RHEL)** | `dnf` | `rustup`, `pyenv`, `nvm` | gcc, python, node, typescript, rust |
| **Linux (Arch Linux)** | `pacman` | `rustup`, `pyenv`, `nvm` | gcc, python, node, typescript, rust |
| **Windows** | `winget`, `scoop` | `rustup`, `nvm` | gcc (MSYS2), python, node, typescript, rust |

- **特権の昇格について**: `apt` などのシステム全体に影響するパッケージ操作が必要な際、一時的に `sudo` のパスワード入力を求められる場合があります。
- **外部 Nim などの診断診断定義の動的拡張**:
  ホームディレクトリの `~/.atcoder-next/toolchains.json` から外部ツールチェーン定義を自動ロードして組み込み定義とマージします。独自のNimなどの定義を追加することで、任意のマイナー言語でも環境診断やセットアップを拡張できます。

---

## 2. ソースコードバンドラー (`bundle`)

競技プログラミングライブラリなどの複数のローカルモジュール（ソースコード）をインクルード展開し、AtCoderへの提出用に1つのファイルにマージします。

```bash
atc tools bundle <entryFile> [-o, --output <file>]
```
- `-o` または `--output` を指定しなかった場合は、`[base].bundle.[ext]` の名前で同じディレクトリに出力されます。
- C++, C, JavaScript, TypeScript, Python, Rust に対応しています。
- JavaScript / TypeScript では内部で `esbuild.buildSync` を使用してメモリ上で高速にインプロセスバンドルされます。

> [!WARNING]
> **バンドラーの制限事項**
> 本機能は、ソースコード内のインクルード記述（C++の `#include "..."`、Pythonの `import` / `from ... import`、Rustの `mod` など）に対して、正規表現を用いた文字列置換を行う簡易的なものです。（JS/TSはesbuild使用）
> マクロや条件分岐による制御（C++の `#ifdef` など）や、コメントや文字列リテラル内部に書かれたインクルード記述といった、言語ごとの高度な文脈解析には対応していません。

> [!CAUTION]
> **ディレクトリトラバーサル対策について**
> セキュリティ保護のため、バンドラーに指定するソースファイルおよび依存関係で解決されるすべてのモジュールは、**ワークスペースルートの内部**に位置している必要があります。外部のパスにあるファイルを読み込もうとすると、`Access denied: File is outside the workspace root.` エラーが投げられ、処理は中断されます。
