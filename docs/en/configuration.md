# Configuration Settings

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This document explains configuration settings, configuration file structures, and available environment variables for AtCoder Next.

---

## 1. Workspace Configuration (`.atcoder-next/settings.json`)

The main settings file created in your workspace during initialization (`atc init`).

### Structure and Schema
The settings file is validated upon loading. Any corrupted keys or type mismatches are automatically sanitized and merged with default values.

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

* **`defaultLanguage`**: Default language used when creating new task folders.
* **`languages`**: Build/run commands and extension definitions per language.
  * **`extension`**: Source file extension.
  * **`templateDir`**: Directory for the initial template code (`workspaceRoot/templates/[name]`).
  * **`build`**: Command to compile/build your code before testing (leave empty if not needed).
  * **`run`**: Command to run/execute compiled outputs or scripts.
  * **`submitFile`**: Name of the source file to submit to AtCoder.
  * **`atcoderLanguage`**: Literal text matching AtCoder's submission language dropdown (automatically matched if empty).
  * **`atcoderLanguageIdRegex`**: Internal regex used to identify dropdown options.
* **`testDirName`**: Name of the directory where test cases are stored.
* **`contestDir`**: Optional parent directory for contest folders (e.g. if set to `src`, files will download under `workspaceRoot/src/abc300/...`).
* **`lang`**: Display language for the CLI (`ja` or `en`).
* **`extractProblemStatement`**: Automatically extract task statements as Markdown (`problem.md`).
* **`problemLang`**: Preferred language for problem statement extraction (`ja` or `en`).

---

## 2. Environment Variables

You can customize or control the behavior of the AtCoder Next CLI by specifying environment variables during execution.

### How to Set Environment Variables

#### Temporarily for a Single Command Run (Linux / macOS)
Prepend the variable definition directly before the command:
```bash
ATC_YES=true atc init
```

#### Temporarily for a Single Command Run (Windows PowerShell)
Set the environment variable in the session before running the command:
```powershell
$env:ATC_YES="true"
atc init
```

#### Permanently for Your Shell Session (Linux / macOS)
Add the export statement to your shell configuration file (e.g., `~/.zshrc` or `~/.bashrc`):
```bash
export ATC_YES=true
```

---

### Available Environment Variables and Details

#### `ATC_YES`
- **Assigned Value**: `true`
- **Behavior**: Bypasses all interactive confirmation prompts, automatically proceeding as if you selected default options or answered "Yes". When executing `atc submit`, even if local test cases fail, the confirmation prompt is skipped, and the code is submitted directly to AtCoder.
- **Common Use Case**: Running automatic tests or submission scripts in CI/CD environments like GitHub Actions.

#### `ATC_NON_INTERACTIVE`
- **Assigned Value**: `true`
- **Behavior**: Completely disables interactive prompt inputs (`@clack/prompts`). Any command that attempts to render a prompt will immediately exit with an error or force-fallback to its non-interactive default behavior.
- **Common Use Case**: Running inside containers or automation scripts where TTY detection might not behave correctly, ensuring the process never hangs waiting for input.

#### `ATC_DEBUG`
- **Assigned Value**: `true`
- **Behavior**: Enhances error output verbosity. When an error occurs, the full internal JS callstack (stack trace) is printed directly to stderr instead of being omitted.
- **Common Use Case**: Debugging abnormal tool behaviors or gathering log outputs for bug reports.

#### `ATC_EXEC_WRAPPER`
- **Assigned Value**: Any command string to use as a prefix (e.g., `docker run --rm -v ...`)
- **Behavior**: Dynamically prepends the specified wrapper command prefix to both the `build` and `run` commands configured in `settings.json` during execution.
- **Example Usage**:
  Run a test with the environment variable set:
  ```bash
  ATC_EXEC_WRAPPER="docker run --rm -v $(pwd):/workspace -w /workspace compiler-image" atc test
  ```
  If your configured `run` command in `settings.json` is `./a.out`, the actual command executed by the test runner expands to:
  ```bash
  docker run --rm -v $(pwd):/workspace -w /workspace compiler-image ./a.out
  ```
- **Common Use Case**: Compiling and executing programs inside an isolated sandbox like a Docker container to avoid polluting your host environment.

