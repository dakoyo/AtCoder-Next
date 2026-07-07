# Quick Start

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This is the simplest guide to setting up your environment for competitive programming using AtCoder Next.

This guide covers the entire process, from installing the tool to automatically setting up the required compilers and runtimes.

---

## 1. Setup Procedures

Follow the steps below to set up your environment.

### Preparation: Installing Node.js

AtCoder Next requires Node.js (version 18 or higher recommended). If you haven't installed it yet, use one of the following methods:

* **Windows / macOS**: Download and install the Recommended (LTS) version from the [Official Node.js Website](https://nodejs.org/).
* **macOS (via Homebrew)**: Run `brew install node` in your terminal.
* **Linux (Ubuntu/Debian)**: Run `sudo apt update && sudo apt install nodejs npm` in your terminal.

### Step 1: Installing AtCoder Next

Once Node.js is installed, open your terminal (or Command Prompt) and run the following command:

```bash
npm install -g atcoder-next

```

### Step 2: Initializing the Workspace

Navigate to the folder where you want to work and run the initialization command:

```bash
# Initialize the workspace
atc init

```

When you run this, you will be asked a few configuration questions. In most cases, you can press Enter to proceed with the default settings. This will generate the configuration files and code templates.

### Step 3: Logging into AtCoder

Run the login command to enable features like code submission and problem fetching:

```bash
atc login

```

You can choose between browser-based authentication or manual cookie input, but using the browser is generally recommended.

A browser window will open automatically. Once you log into AtCoder in the browser, the terminal will automatically capture the session information and complete the login process.

### Step 4: Automatic Toolchain Setup

Automatically diagnose and install the required compilers and execution environments needed to build and run your programs.

```bash
atc tools setup

```

The tool will run a diagnostic check. If any missing compilers (such as GCC for C++) or runtimes are detected, they will be installed automatically.

Your environment setup is now complete.

---

## 2. Disadvantages and Precautions of Automatic Setup

While the automatic setup via `atc tools setup` is convenient, please be aware of the following disadvantages and precautions:

### System Impact and Administrator Privileges

In environments like Linux, tools are installed via the system-wide package manager, which may require you to enter your administrator password (`sudo`). Because this makes changes to your system, caution is advised on shared PCs.

### Conflicts with Existing Installations

If you already have compilers or execution environments (such as Python) installed locally, this automatic setup may install different versions alongside them.

This can disrupt the priority of your environment variables (PATH), which may affect your other development projects or cause the wrong compiler to be invoked.

### Network Traffic and Processing Time

Since multiple toolchains are downloaded and configured all at once, the process consumes a large amount of network data. Additionally, compiling or installing these tools may take several minutes or more.

### Limitations in Environments Without Package Managers

This feature relies on OS-specific package managers (such as Homebrew for macOS, or winget/scoop for Windows). In environments where these are not installed, the automatic installation will fail. You will need to manually install a package manager first, or install the compilers individually.