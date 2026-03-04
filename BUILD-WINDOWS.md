# Building Chappy on Windows

Simple steps to build Chappy on Windows 10 or 11.

## Prerequisites

1. **Node.js** (one-time setup)
   - Go to [https://nodejs.org](https://nodejs.org)
   - Download the **LTS** version
   - Run the installer (accept defaults)
   - Close and reopen Command Prompt after installing

## Build steps

1. **Download the repo**
   - On GitHub: Code → Download ZIP
   - Extract the ZIP (e.g. to your Desktop)

2. **Open Command Prompt**
   - Press `Win + R`, type `cmd`, press Enter
   - Or: Start menu → type "Command Prompt" → open it

3. **Go to the folder**
   - Type `cd ` (with a space), then drag the extracted folder into the Command Prompt window, then press Enter
   - Or type the path manually, e.g. `cd C:\Users\YourName\Desktop\chappy-main`

4. **Install and build**
   ```
   npm install
   npm run build:windows
   ```
   The first command may take a few minutes (downloads dependencies).

5. **Find the app**
   - Open the `release` folder in the project
   - **Chappy 0.0.1.exe** — double-click to run (no install)
   - **Chappy Setup 0.0.1.exe** — run to install with Start Menu shortcut
