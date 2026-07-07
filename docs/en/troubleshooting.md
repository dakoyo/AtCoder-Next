# Troubleshooting

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This document explains solutions to common issues encountered while using AtCoder Next, as well as local testing criteria.

---

## 1. Troubleshooting

### Browser Auto-login Fails or Does Not Launch
- **Cause**: Compatible Chromium-based browsers may not be installed, or connection might fail due to port conflicts.
- **Solution**: Use the manual cookie input method:
  1. Log in to AtCoder (https://atcoder.jp) in your normal web browser.
  2. Open Developer Tools (F12), go to the "Application" or "Storage" tab, select "Cookies", and copy the value of `REVEL_SESSION`.
  3. Run `atc login` in your terminal, select "Manually enter Cookie" from the menu, and paste the value.

### How to Check Detailed Logs When Errors Occur
- **Solution**: Run your command with the `--debug` flag:
  ```bash
  atc test --debug
  ```
  This prints full internal stack traces to stderr, making it easier to pinpoint the source of the problem.

### Toolchain Installation Commands Fail
- **Solution**: If `atc tools setup` fails, it might be due to local security settings or missing PATH configurations.
  A detailed installation log is saved in `~/.atcoder-next/install.log`. You can inspect the logs to identify the issue, manually install the required compilers, and update the paths in `.atcoder-next/settings.json`.

---

## 2. Local Test Judging Criteria

The status criteria evaluated by `atc test` are defined as follows:

- **AC (Accepted)**: The program output matches the expected sample case output exactly. Trailing newlines and extra whitespaces are automatically ignored.
- **WA (Wrong Answer)**: The program output differs from the expected sample output. The line number where the mismatch starts is displayed in the test results.
- **RE (Runtime Error)**: An exception occurs during execution, or the program exits with a non-zero exit code.
- **TLE (Time Limit Exceeded)**: Execution duration exceeds the limits specified for the task. Limits are fetched and cached in `contest-metadata.json` during task setup (`atc new`). If not fetched, the default time limit in `settings.json` (defaults to 2000 ms) is used.
