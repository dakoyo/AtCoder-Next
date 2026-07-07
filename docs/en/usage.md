# Basic Usage

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This guide explains the basic workflow of competitive programming using AtCoder Next.

---

## 1. Initialization

Initialize a project in the root directory where you want to work.

```bash
atc init [dir]

```

- The `[dir]` argument is optional. If specified, it creates and initializes that directory.
- In non-interactive environments (such as CI) or when the `--yes` option is specified, confirmation prompts are skipped, and the project is automatically set up in English with C++ as the default language and no problem statement extraction.

---

## 2. Login

Run this command before using features that require authentication, such as submitting solutions to AtCoder.

```bash
atc login

```

- **Browser**: A Chromium-based browser will automatically launch. Once you log into AtCoder, your session cookie is automatically captured and saved.
- **Manual Cookie Input**: You can log in by directly pasting the `REVEL_SESSION` value obtained from your browser's Developer Tools.

*To log out (destroy the session), run the following command:*

```bash
atc logout

```

To check your current login status, run:

```bash
atc whoami

```

---

## 3. Downloading Contest Problems

```bash
atc new <contest_id> [task_label]

```

- Example: `atc new abc300`
- An interactive checklist will appear, allowing you to select which problems to download.
- Use the `-a` or `--all` option to automatically set up all problems.
- Except during live contests, problem statements are automatically extracted in Markdown format and saved locally.

---

## 4. Omitting Arguments (Smart Path Resolution)

Commands like `atc test` and `atc submit` automatically infer the contest ID and task label based on your current working directory.

- **Inside a problem directory** (e.g., `/workspace/abc300/a`):
You can run tests or submit solutions without providing any arguments.
```bash
atc test
atc submit

```


- **Inside a contest directory** (e.g., `/workspace/abc300`):
You only need to specify the task label (`a`, `b`, etc.).
```bash
atc test a
atc submit a

```


- **From any other directory**:
You must explicitly specify all arguments.
```bash
atc test abc300 a
atc submit abc300 a

```



---

## 5. Local Testing

Run local tests against the downloaded sample test cases.

```bash
atc test [contestIdOrTask] [taskLabel] [-f, --file <file>]

```

- The alias `atc t` can also be used.
- Use the `-f` or `--file` option to run tests against a specific source file (e.g., `solution.cpp`) instead of the automatically detected code file.

---

## 6. Submitting Code

```bash
atc submit [contestIdOrTask] [taskLabel] [-f, --file <file>]

```

- The alias `atc s` can also be used.
- Local tests will automatically run before submission.
- If the tests fail, a confirmation prompt will appear. (If the `--yes` option is enabled, it will print a warning and submit automatically).
- After submission, the judge's progress (e.g., WJ ➡ 1/15 ➡ AC) is displayed in real-time.
- If blocked by protection features like Cloudflare Turnstile, the code is copied to your clipboard, and the submission page opens in your browser.