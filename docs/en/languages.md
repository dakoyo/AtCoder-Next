# Language Settings

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This document describes how to switch display languages (Locale) and manage programming languages (Language) in your workspace.

---

## 1. Switch CLI Display Language

Change the display language of the CLI messages and output:

```bash
atc lang [en|ja]
```
- Specify `en` or `ja` as an argument to change the display language.
- If omitted, an interactive selection menu will be shown.

---

## 2. Programming Language Configuration

Configure the build/execution commands and code templates for the programming languages you write solutions in:

```bash
atc language [add|default] [lang_id]
```
- Alias **`atc l`** can also be used.

### ① Add a New Programming Language
```bash
atc language add [lang_id]
# Example: atc l add python
```
- You can add built-in definitions (`cpp`, `python`, `rust`, `typescript`, `javascript`, `c`) as well as custom languages using any name.
- Adding a built-in language automatically populates extension details, build commands, execution commands, and initial template code.
- If a custom language ID is specified, you will be prompted to enter the file extension, build command, and run command interactively.

### ② Set Workspace Default Language
```bash
atc language default [lang_id]
# Example: atc l default rust
```
- Sets the default programming language used when scaffolding new tasks (`atc new`).

---

## 3. Global Presets Caching

In addition to built-in presets, custom programming language configurations are dynamically saved to a global cache.

- **Global Language Cache**: 
  Newly added programming languages are cached in `~/.atcoder-next/languages.json`.
  This allows newly initialized workspaces (`atc init`) to automatically inherit previously added custom languages as presets.
