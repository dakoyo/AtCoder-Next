# AtCoder Next

AtCoder Next is a CLI tool designed to assist with competitive programming on AtCoder.
It automates workflows on your local machine, including workspace initialization, downloading sample test cases, running tests, submitting code, and diagnosing/installing compiler environments.

![AtCoder Next Demo](docs/media/vhs/en.gif)

## Features

- **Local Test Execution**: Features in-process builds using esbuild, caching of downloaded task execution limits, and polling with exponential backoff to monitor judge status.
- **Code Bundling**: Consolidates dependency files (C++, Python, Rust, JavaScript, TypeScript) into a single file for submission. Includes path validation to prevent reading files outside the workspace root for security.
- **Environment Diagnostics & Auto Setup (`doctor` / `setup`)**: Detects differences between local compiler versions and official AtCoder environments, and handles automatic installation when required.
- **Session Protection**: Encrypts session cookies and private keys with AES-256-CBC, saving them locally with strict `0o600` permissions.

---

## Installation

Make sure Node.js (v18 or higher) is installed, and run:

```bash
npm install -g atcoder-next
```

---

## Getting Started (Quick Start)

```bash
# 1. Initialize your workspace
atc init

# 2. Log in to AtCoder
atc login

# 3. Setup a contest (e.g. abc300)
atc new abc300

# 4. Navigate to the task directory, write your solution, and test/submit
cd abc300/a
atc test     # Alias: atc t
atc submit   # Alias: atc s
```

---

## Documentation

For detailed usage instructions and configurations, please visit the [Official Documentation Site](https://dakoyo.github.io/AtCoder-Next/) or read the files below:

* [Quickstart](docs/en/quickstart.md)
* [Basic Usage (Login, Test, Submit)](docs/en/usage.md)
* [Language Settings & Presets](docs/en/languages.md)
* [Template Customization](docs/en/templates.md)
* [Toolchain Setup & Code Bundler](docs/en/tools.md)
* [Configuration Reference (settings.json & env variables)](docs/en/configuration.md)
* [Troubleshooting](docs/en/troubleshooting.md)
* [System Specifications](docs/en/internals.md)

---

## Guidelines

Please respect AtCoder's terms of service and avoid copyright issues:

* **Ongoing Contests**: Markdown problem extraction is automatically disabled for active contests. Do not attempt to bypass this restriction.
* **Code and Statement Sharing**: Do not upload or share directories containing extracted problem statements (`problem.md`) to public locations (such as public GitHub repositories).

## License

See [LICENSE](LICENSE) for details. This project has been developed with reference to [online-judge-tools/oj](https://github.com/online-judge-tools/oj) and [Tatamo/atcoder-cli](https://github.com/Tatamo/atcoder-cli).