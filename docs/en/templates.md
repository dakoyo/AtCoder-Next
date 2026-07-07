# Template Customization

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This document explains how to configure and customize your default solution code templates in AtCoder Next.

---

## 1. How Templates Work

Initializing a workspace (`atc init`) generates a `templates/` folder in your project root.
When you create task directories using `atc new`, the files under the selected programming language folder inside `templates/` are copied directly into the new task directory.

---

## 2. Customization Steps

### Customizing Initial Code
You can pre-configure templates with your library imports, common macros, and fast I/O setup (like `ios::sync_with_stdio(false)` for C++).

- **For C++**:
  Edit `templates/cpp/main.cpp` (or your template file) to add your initial boilerplate code.
- **For Python**:
  Edit `templates/python/main.py`.

### Automatically Adding Extra Files
Any files placed inside the template directory (such as extra notes or script files) will also be copied into the task directories automatically.
- **Example**: If you put a note text file (`notes.txt`) or debugging scripts inside `templates/cpp/`, they will be generated under each task folder whenever you run `atc new`.
