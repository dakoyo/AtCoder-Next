# atcoder-next (atc)

日本語: [README](README.md)

AtCoder Next is a powerful, local-first CLI tool designed to streamline and optimize your competitive programming workflow on AtCoder.

## Terminal Demo
![Screencast](./docs/media/vhs/en.gif)

After installation, simply navigate to your competitive programming directory and run the following commands to complete your environment setup:

```bash
# 1. Initialize workspace (configure languages and templates)
atc init

# 2. Log in to AtCoder
atc login

# 3. Automatically set up the toolchain
atc t setup

```

## Key Features

* **Interactive CLI**: Built with `@clack/prompts` to provide a visually intuitive and user-friendly prompt interface.
* **Seamless Login**: Supports both automated browser login and direct cookie input.
* **Scaffold Generation**: Automatically downloads directory structures, template files, and sample test cases by specifying a contest ID (e.g., `abc300`).
* **Fast Local Testing**: Compiles and runs your code against sample cases. Execution time limits are automatically fetched from AtCoder.
* **Smart Submission & Real-time Judging**: Automatically runs local tests before submitting. After submission, you can monitor the judging status (`AC` / `WA` / `TLE`, etc.) in real time.
* **Toolchain Diagnostics & Setup (`doctor` / `setup`)**: Diagnoses discrepancies between your local compiler versions and AtCoder's official judge environment, helping you set up the correct environment easily.
* **Source Code Bundler (C++ Only)**: Merges a library split across multiple files or local header files into a single, submittable C++ file (※ Currently supports C++ only).
* **Multi-language Support**: Native support for both English and Japanese.

---

## Quick Start

### 1. Installation

You can install the package globally via npm:

```bash
npm install -g atcoder-next

```

### 2. Initialize Workspace

Navigate to your competitive programming workspace directory and run:

```bash
atc init

```

* Select your preferred display language (English or Japanese).
* Choose whether to extract problem statements as Markdown files.
* Select your default language template (C++, Python, Rust, TypeScript, JavaScript, C, etc.).

### 3. Log In to AtCoder

To enable the submission feature, you need to log in:

```bash
atc login

```

* **Browser (Recommended)**: A browser window will launch. Once you log in to AtCoder, the CLI will automatically capture your session.
* **Manual Cookie Input**: Paste the `REVEL_SESSION` value retrieved from your browser's Developer Tools.

---

## Basic Usage

### 1. Fetch Contest Information

```bash
atc new <contest_id>
# Example: atc new abc300

```

* An interactive checklist will appear, allowing you to select which problems to download.
* Use the `-a` or `--all` option to download all problems without showing the prompt.
* If Markdown downloading is enabled in your settings, problem statements will be downloaded in Markdown format (excluding ongoing contests), which you can preview using features like VS Code's Markdown Preview.

### 2. Run Tests

Run the command inside a specific problem directory, or specify the problem target.

```bash
# Run tests for the problem in the current directory
atc test

# Run tests for a specific problem
atc test abc300 a

```

### 3. Submit Code

```bash
# Submit the code in the current directory
atc submit

# Submit code for a specific problem
atc submit abc300 a

```

* The tool automatically compiles and runs local tests before submitting. If any tests fail, a prompt will ask whether you want to proceed with the submission.

---

## Extended Tools

### Diagnostics & Toolchain Setup (`doctor` / `setup`)

Align your local compiler versions with AtCoder's official environment.

```bash
# Diagnose local environment
atc tools doctor

# Automatically install and configure compiler tools
atc tools setup

```

> [!NOTE]
> **Supported OS & Limitations**
> * The `doctor` / `setup` features have been tested in GitHub Actions CI environments (Ubuntu, macOS, Windows). However, unexpected behavior may occur depending on your specific local environment configurations (security restrictions, PATH settings, conflicts between multiple package managers, etc.).
> * If the automatic installation fails, please check the error messages or the logs in `~/.atcoder-next/install.log`, set up the tools manually, and update the build/execution commands in `.atcoder-next/settings.json`.
> 
> 

### Source Code Bundler (`bundle`)

Merge multiple local code modules into a single file.

```bash
# Bundle a Python file and its imports into one file
atc tools bundle main.py -o dist/main.bundle.py

# "tools" can be abbreviated as "t". If "-o" is omitted, it outputs to main.bundle.cpp by default.
atc t bundle main.cpp

```

> [!WARNING]
> **Bundler Limitations (Across all languages)**
> This feature performs simple string replacement using regular expressions for include/import statements (such as `#include "..."` in C++, `import` / `from ... import` in Python, or `mod` in Rust). It does not support advanced syntax analysis for specific languages, such as macro/conditional branching control (e.g., `#ifdef` in C++) or include statements written inside comments or string literals. Please be cautious when bundling complex module structures or external libraries.

---

## Configuration

An `.atcoder-next/settings.json` file will be created upon initialization.
This file contains information such as your configured programming languages, file extensions, compile flags, and execution commands. You can freely edit this file to suit your needs.

---

## Important Guidelines

To comply with AtCoder's terms of service and avoid copyright issues, please note the following:

* **Ongoing Contests**: The Markdown problem extraction feature is automatically disabled during active contests. Do not bypass this restriction for purposes such as feeding problems into AI tools.
* **Prohibition of Sharing**: Do not publish or share extracted problem statements in public repositories.

## Acknowledgments

This tool was inspired by and built upon the excellent work of the following projects. We deeply appreciate their contributions to the competitive programming ecosystem:

* [online-judge-tools/oj](https://github.com/online-judge-tools/oj) : For the core mechanisms of automated test case downloading and testing.
* [Tatamo/atcoder-cli](https://github.com/Tatamo/atcoder-cli) : For the directory structure scaffolding and contest management workflows.

For detailed licensing information, please refer to the [LICENSE](https://www.google.com/search?q=LICENSE) file.