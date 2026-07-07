Here is the English translation of the README, formatted to match the original:

---

# atcoder-next (atc)

日本語: [README](README.md)

AtCoder Next is a CLI tool designed to streamline competitive programming on AtCoder.

## Terminal Demo
![Screencast](./docs/media/vhs/en.gif)

After installation, simply run the following commands in your competitive programming directory to set up your environment.

```bash
# 1. Initialize the workspace (configure languages and templates)
atc init

# 2. Log in to AtCoder
atc login

# 3. Automatic toolchain setup
atc t setup

```

## Features

* **Interactive CLI**: Features highly visual, intuitive prompts powered by `@clack/prompts`.
* **Seamless Login**: Supports both automatic browser-based login and direct cookie input.
* **Workspace Scaffolding**: By specifying a contest ID (e.g., `abc300`), it automatically downloads the problem directory structure, template files, and sample test cases.
* **Fast Local Testing**: Compiles and executes your code against sample cases. Problem time limits are automatically fetched from AtCoder.
* **Smart Submission & Real-time Judging**: Automatically runs local tests before submitting. After submission, you can monitor the judge status (AC/WA/TLE, etc.) in real time.
* **Toolchain Diagnosis & Setup (`doctor`/`setup`)**: Diagnoses discrepancies between your local compiler version and AtCoder's official execution environment, assisting you in setting up the correct compiler version for your system.
* **Source Code Bundler**: Merges multi-file libraries or local header files into a single, submission-ready file.
* **Multi-language Support**: Natively supports both English and Japanese.

---

## Quick Start

### 1. Installation

You can install the tool globally via npm:

```bash
npm install -g atcoder-next

```

### 2. Initialize Workspace

Navigate to your competitive programming directory and run the following command:

```bash
atc init

```

* Select your display language (English or Japanese).
* Choose whether to extract problem statements as Markdown.
* Select your default language template (C++, Python, Rust, TypeScript, JavaScript, C, etc.).

### 3. Log in to AtCoder

Logging in is required to use the submission feature.

```bash
atc login

```

* **Browser (Recommended)**: A browser window will open. Once you log in to AtCoder, the CLI will automatically capture the session.
* **Manual Cookie Input**: Paste the value of the `REVEL_SESSION` cookie obtained from your browser's Developer Tools.

---

## Basic Usage

### 1. Fetch Contest Information

```bash
atc new <contest_id>
# Example: atc new abc300

```

* An interactive checklist will appear, allowing you to select which problems to download.
* Use the `-a` or `--all` option to download all problems instantly without prompts.
* If Markdown downloading is enabled in your settings, problem statements will be downloaded in Markdown format (except for ongoing contests), allowing you to view them using preview features in editors like VSCode.

### 2. Run Tests

Run the command inside the target problem's directory, or specify the problem explicitly.

```bash
# Run tests for the problem in the current directory
atc test

# Run tests for a specific problem
atc test abc300 a

```

### 3. Submit Code

```bash
# Submit code for the problem in the current directory
atc submit

# Submit code for a specific problem
atc submit abc300 a

```

* Compiles and runs local tests automatically before making a submission. If any tests fail, a prompt will ask whether you still want to proceed with the submission.

---

## Extended Tools

### Diagnosis and Toolchain Setup (`doctor` / `setup`)

Align your local compiler versions with AtCoder's official environment.

```bash
# Diagnose local environment
atc tools doctor

# Automatically install and configure compiler tools
atc tools setup

```

> [!NOTE]
> **Supported OS and Package Managers for Auto-Installation**
>
> The `doctor` / `setup` commands attempt to perform automatic installations using the following package managers depending on the system environment:
>
> | OS | Package Manager | Dedicated Version Manager | Target Toolchains |
> | :--- | :--- | :--- | :--- |
> | **macOS** | Homebrew (`brew`) | `rustup`, `pyenv`, `nvm` | gcc, clang, python, node, typescript, rust |
> | **Linux (Ubuntu/Debian)** | `apt` (with PPA) | `rustup`, `pyenv`, `nvm` | gcc, clang, python, node, typescript, rust |
> | **Linux (Fedora/RHEL)** | `dnf` | `rustup`, `pyenv`, `nvm` | gcc, python, node, typescript, rust |
> | **Linux (Arch Linux)** | `pacman` | `rustup`, `pyenv`, `nvm` | gcc, python, node, typescript, rust |
> | **Windows** | `winget`, `scoop` | `rustup`, `nvm` | gcc (via MSYS2), python, node, typescript, rust |
>
> * **Security Note**: When performing system-wide operations (e.g. `apt`), the tool may request temporary elevation of privileges using `sudo`.
> * The `doctor` / `setup` features are tested on GitHub Actions CI environments (Ubuntu, macOS, Windows). However, unexpected behaviors may occur depending on your individual local environment (security restrictions, PATH configurations, conflicts between multiple package managers, etc.).
> * If the automatic installation fails, check the error messages or the logs in `~/.atcoder-next/install.log`, manually install the required tools, and update the build/execution commands in `.atcoder-next/settings.json`.

### Source Code Bundler (`bundle`)

Merge multiple local code modules into a single file. (Supports C++, C, JavaScript, TypeScript, Python, and Rust)

```bash
# Consolidate file imports into a single file
atc tools bundle main.rs -o bundle.rs

# "tools" can be abbreviated as "t". If "-o" is omitted, it defaults to main.bundle.cpp.
atc t bundle main.cpp

```

> [!WARNING]
> **Bundler Limitations (Across all languages)**
> This feature uses simple regular-expression-based text replacement to resolve include/import statements (such as `#include "..."` in C++, `import` / `from ... import` in Python, or `mod` in Rust). Note that JavaScript and TypeScript utilize `esbuild` under the hood. It does not perform advanced context analysis per language, meaning it cannot properly handle macros or conditional branches (e.g., `#ifdef` in C++), or include statements hidden inside comments or string literals. Please be cautious when bundling complex module structures or external libraries.

---

## Configuration

An `.atcoder-next/settings.json` file is generated during initialization.
This file contains details such as configured programming languages, extensions, compilation flags, and execution commands. You can freely edit this file to suit your needs.

---

## Important Guidelines

To comply with AtCoder's terms of service and avoid copyright issues, please keep the following in mind:

* **Ongoing Contests**: The feature to extract problem statements into Markdown is automatically disabled for active/ongoing contests. Do not attempt to bypass this restriction, especially for the purpose of feeding problems into AI tools.
* **No Sharing**: Do not publish extracted Markdown problem statements in public repositories.

## Acknowledgments

This tool was inspired by and refers to features from the following excellent projects:

* [online judge tools/oj](https://github.com/online-judge-tools/oj): For automatic test case downloading and submission mechanisms.
* [Tamamo/atcoder-cli](https://github.com/Tatamo/atcoder-cli): For directory structure auto-generation and contest management workflows.

For detailed licensing information, please refer to the [LICENSE](https://www.google.com/search?q=LICENSE) file.