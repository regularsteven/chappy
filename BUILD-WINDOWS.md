# Chappy on Windows

## Simplest: Download and run (no build, no Node.js)

1. Go to [Releases](https://github.com/regularsteven/chappy/releases)
2. Download **Chappy Setup 0.0.1.exe** (installer) or **Chappy 0.0.1.exe** (portable, no install)
3. Double-click to run

That's it. No Node.js, no Command Prompt, no build.

---

## Building from source

You need Node.js first. **Do this before anything else.**

### Step 1: Install Node.js (required)

1. Go to [https://nodejs.org](https://nodejs.org)
2. Click the **LTS** download (green button)
3. Run the installer — accept all defaults, click Next through
4. **Close Command Prompt if it's open** — then open a new one (Node won't work until you do)

### Step 2: Download the repo

- On GitHub: Code → Download ZIP
- Extract the ZIP (e.g. to your Desktop)

### Step 3: Build

1. Open Command Prompt (Win + R, type `cmd`, Enter)
2. Go to the folder: type `cd ` (with a space), drag the extracted folder into the window, press Enter
3. Run:
   ```
   build.bat
   ```
   Or manually:
   ```
   npm install
   npm run build:windows
   ```

4. Find the app in the `release` folder
