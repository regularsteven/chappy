@echo off
echo Checking for Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js is not installed. You need it before building.
  echo.
  echo 1. Go to https://nodejs.org
  echo 2. Download the LTS version
  echo 3. Run the installer ^(accept defaults^)
  echo 4. Close this window, open a new Command Prompt, then run build.bat again
  echo.
  pause
  exit /b 1
)

echo Node.js found. Installing and building...
call npm install
if errorlevel 1 exit /b 1
call npm run build:windows
if errorlevel 1 exit /b 1
echo.
echo Done. Check the release folder for Chappy.exe
pause
