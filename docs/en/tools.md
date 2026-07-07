# Extended Tools

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This document describes the advanced development utility tools (toolchain diagnosis, installation, and code bundling) provided by AtCoder Next.

---

## 1. Toolchain Diagnosis & Setup (`doctor` / `setup`)

Align your local compiler and interpreter versions with AtCoder's official judge environment.

```bash
# Diagnose local version mismatches
atc tools doctor

# Automatically install missing toolchains and update configuration
atc tools setup
```
- Alias **`atc tl`** can also be used.

### Supported Operating Systems & Package Managers
The tool detects your operating system and leverages available package/version managers to install missing versions:

| OS | Package Manager | Dedicated Version Manager | Target Toolchains |
| :--- | :--- | :--- | :--- |
| **macOS** | Homebrew (`brew`) | `rustup`, `pyenv`, `nvm` | gcc, clang, python, node, typescript, rust |
| **Linux (Ubuntu/Debian)** | `apt` | `rustup`, `pyenv`, `nvm` | gcc, clang, python, node, typescript, rust |
| **Linux (Fedora/RHEL)** | `dnf` | `rustup`, `pyenv`, `nvm` | gcc, python, node, typescript, rust |
| **Linux (Arch Linux)** | `pacman` | `rustup`, `pyenv`, `nvm` | gcc, python, node, typescript, rust |
| **Windows** | `winget`, `scoop` | `rustup`, `nvm` | gcc (MSYS2), python, node, typescript, rust |

- **Security Note**: When executing system-wide commands (e.g. `apt`), the tool may request temporary administrative privileges using `sudo`.
- **Dynamic Diagnostics Extension**:
  The tool dynamically merges built-in definitions with custom definitions from `~/.atcoder-next/toolchains.json`. You can define custom environments (such as Nim, Go, etc.) to expand diagnosis capabilities.

---

## 2. Source Code Bundler (`bundle`)

Consolidate multiple local files/modules (e.g. helper library modules) into a single file for AtCoder submission.

```bash
atc tools bundle <entryFile> [-o, --output <file>]
```
- If `-o` or `--output` is omitted, the bundled file is created in the same directory as `[base].bundle.[ext]`.
- Supports C++, C, JavaScript, TypeScript, Python, and Rust.
- JavaScript / TypeScript runs an in-process build using `esbuild.buildSync` inside memory for fast consolidation.

> [!WARNING]
> **Bundler Limitations**
> The bundler resolves include/import statements (such as `#include "..."` in C++, `import` / `from ... import` in Python, or `mod` in Rust) via simple regular-expression replacement (except for JS/TS which uses esbuild).
> It does not contextually parse language structures, meaning it cannot properly resolve conditional compiler macros (e.g., `#ifdef` in C++) or include lines within comments or string literals.

> [!CAUTION]
> **Directory Traversal Protection**
> For security purposes, the bundler requires all files (entry file and all dependencies) to reside **strictly inside your workspace root**. Trying to bundle files outside this directory will throw an `Access denied: File is outside the workspace root.` error and abort the process.
