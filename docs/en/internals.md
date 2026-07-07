# Internal System Specifications

> [!NOTE]
> This documentation has been translated from Japanese using AI translation.

This document explains the primary mechanisms implemented within AtCoder Next, including the background behind their implementation.

---

## Rate Limiter (Asymptotic Delay Method)

To minimize the load on AtCoder servers and prevent unintended access restrictions (IP bans), we have implemented a rate limiter that dynamically adjusts delay times based on access frequency.

The basic approach relies on the following two principles:

* The delay time increases as consecutive accesses occur.
* The penalty decreases over time when the interval between accesses widens.

The specific processing steps are as follows:

**(1) Recovery via Elapsed Time**
The elapsed time (in seconds) since the last access is multiplied by a recovery rate (`recoveryRate`), and this value is subtracted from the consecutive access count. This allows the penalty to naturally diminish as the time interval between requests increases.

**(2) Calculating Delay Time**
As the consecutive access count increases, the delay time scales upward from a minimum value (`minDelay`) toward a maximum value (`maxDelay`). To prevent detection as a mechanical pattern—which simple linear scaling is prone to—we use a curve akin to a sigmoid function to increase the delay asymptotically.

**(3) Adding Jitter**
A random fluctuation (jitter) of approximately ±10% is added to the calculated delay time. This purpose is to avoid detection as a fixed, periodic pattern.

**(4) State Persistence**
The last access timestamp and the consecutive access count are saved in `~/.atcoder-next/state.json`. This ensures that the access restriction state is shared across processes, even when commands are executed simultaneously from multiple terminals.

**(5) Request Serialization**
To prevent multiple asynchronously issued requests from being sent in parallel, they are processed serially inside the JavaScript environment using a global Promise queue.

---

## Post-Submission Polling (Exponential Backoff)

During the polling process that monitors updates to the judge status (e.g., WJ, AC, WA) after a code submission, the polling interval is dynamically adjusted according to the situation.

* While there is no change in status, the polling interval is multiplied by 1.5 times after each attempt (starting at an initial value of 2.0 seconds, up to a maximum of 10.0 seconds). This measure avoids sending continuous unnecessary traffic to the server during prolonged waiting periods.
* When a change occurs in the status (e.g., transitioning from WJ to "1/15 Judging"), the interval is instantly reset to the minimum value of 2.0 seconds. During periods of active updates, the system tracks the changes as close to real-time as possible.

---

## Session Information Protection

This section covers security measures for storing login credentials (Cookies) locally.

* Cookie information is not saved in plaintext; it is encrypted using AES-256-CBC before being written to `session.json`.
* The encryption key file (`.key`) and `session.json` have their file permissions restricted to `0o600` (or equivalent ACLs in Windows environments) immediately upon creation.

---

## 4. Directory Traversal Mitigation

In the bundling process (`atc tools bundle`) that consolidates solution files into a single file, boundary checks are implemented to prevent unintended file reads.

* When resolving dependencies, the system verifies whether all resolved absolute paths reside under the workspace root directory.
* If an attempt is made to access a location outside the workspace root—via relative references like `..` or absolute path specifications like `/etc/passwd`—the process is aborted immediately, throwing the error: `Access denied: File is outside the workspace root.`

---

## 5. In-Process Bundling

For the TypeScript/JavaScript bundling process (`tools bundle`), instead of launching esbuild as a child process via the CLI, we import esbuild directly as a library and invoke `esbuild.buildSync` within the Node.js process.

This eliminates the tens to hundreds of milliseconds of latency typically incurred by spinning up a child process, allowing the bundling process to finish in a fraction of the time.