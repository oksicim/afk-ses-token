@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Ses AFK Token - Baslat
cd /d "%~dp0"
set "TEST_MODU="
set "KONTROL_MODU="
if /I "%~1"=="--test" (
  set "TEST_MODU=1"
  set "KONTROL_MODU=--offline"
)

echo.
echo ========================================================
echo                   SES AFK TOKEN
echo ========================================================

where node >nul 2>&1
if errorlevel 1 goto :kurulum_gerekli
if not exist "node_modules\discord.js\package.json" goto :kurulum_gerekli
if not exist "config.js" goto :kurulum_gerekli

echo Sistem kontrol ediliyor...
node scripts\sistem-kontrol.js %KONTROL_MODU%
if errorlevel 1 (
  echo.
  echo Sistem kontrolu basarisiz. KURULUM.bat dosyasini tekrar ac.
  pause
  exit /b 1
)

if defined TEST_MODU (
  echo BASLAT.bat testi basarili.
  exit /b 0
)

echo.
echo Sistem baslatiliyor. Durdurmak icin CTRL+C tuslarina bas.
echo.
call npm start
set "APP_EXIT=%errorlevel%"

echo.
echo Sistem kapandi.
pause
exit /b %APP_EXIT%

:kurulum_gerekli
echo Kurulum eksik veya bozuk.
echo Once KURULUM.bat dosyasina cift tikla.
pause
exit /b 1
