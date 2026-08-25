@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
set "TEST_MODU="
if /I "%~1"=="--test" set "TEST_MODU=1"

rem Node.js ve MongoDB servis kurulumu icin yonetici yetkisi gerekir.
if not defined TEST_MODU (
  powershell -NoProfile -Command "if (([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { exit 0 } else { exit 1 }" >nul 2>&1
  if errorlevel 1 (
    echo Kurulum yonetici izni istiyor. Acilan pencerede Evet'e bas.
    set "SES_AFK_KURULUM=%~f0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:SES_AFK_KURULUM -Verb RunAs"
    if errorlevel 1 (
      echo [HATA] Yonetici izni alinamadi.
      pause
    )
    exit /b
  )
)

title Ses AFK Token - Tam Kurulum
set "KONTROL_MODU="
if /I "%~1"=="--offline" set "KONTROL_MODU=--offline"
if defined TEST_MODU set "KONTROL_MODU=--offline"

echo.
echo ========================================================
echo                SES AFK TOKEN TAM KURULUM
echo ========================================================
echo Node.js, npm paketleri ve MongoDB otomatik kontrol edilir.
echo Eksik olanlar otomatik yuklenir. Bu pencereyi kapatma.
echo.

if defined TEST_MODU goto :test_modu

call :node_kontrol
if errorlevel 1 goto :hata

echo.
echo [2/6] npm paketleri kontrol ediliyor...
if exist package-lock.json (
  call npm ci --no-audit --no-fund
) else (
  call npm install --no-audit --no-fund
)
if errorlevel 1 (
  echo [HATA] npm paketleri yuklenemedi.
  echo Internet baglantini kontrol edip KURULUM.bat dosyasini tekrar ac.
  goto :hata
)
echo       npm paketleri hazir.

echo.
echo [3/6] Discord uygulamasi, bot tokeni ve ayarlar hazirlaniyor...
node scripts\kurulum.js --config-kontrol >nul 2>&1
if errorlevel 1 (
  call :tarayici_kontrol
  if errorlevel 1 goto :hata
  node scripts\tarayici-hazirla.js
  if errorlevel 1 goto :hata
)
node scripts\kurulum.js --local-mongo --auto-discord
if errorlevel 1 goto :hata

echo.
call :mongodb_kontrol
if errorlevel 1 goto :hata

echo.
echo [5/6] Discord ve MongoDB baglantilari test ediliyor...
node scripts\sistem-kontrol.js %KONTROL_MODU%
if errorlevel 1 (
  echo Ayarlari duzelttikten sonra KURULUM.bat dosyasini tekrar ac.
  goto :hata
)

echo.
echo [6/6] KURULUM TAMAMLANDI.
echo.
node scripts\kurulum-tamamlandi.js
if errorlevel 1 (
  echo [UYARI] Bot davet penceresi acilamadi.
  echo Discord Developer Portal uzerinden OAuth2 davet linkini olusturabilirsin.
)
echo.
echo Bundan sonra sistemi acmak icin BASLAT.bat dosyasina cift tikla.
echo Kurulumu tekrar yapman gerekmez.
if defined TEST_MODU exit /b 0
pause
exit /b 0

:test_modu
echo [TEST] Dosyalar ve yerel on kosullar kontrol ediliyor...
where node >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi.
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>20||(a===20&&b>=19)?0:1)"
if errorlevel 1 (
  echo [HATA] Node.js 20.19.0 veya daha yeni bir surum gerekli.
  exit /b 1
)
if exist "node_modules\playwright-core\package.json" (
  echo       npm paketleri hazir.
) else (
  echo       npm paketleri temiz repoda yok; gercek kurulumda otomatik yuklenecek.
)
node --check scripts\kurulum.js
if errorlevel 1 exit /b 1
node --check scripts\discord-uygulama-kur.js
if errorlevel 1 exit /b 1
node --check scripts\sistem-kontrol.js
if errorlevel 1 exit /b 1
node scripts\kurulum-tamamlandi.js --test
if errorlevel 1 exit /b 1
call :tarayici_kontrol
if errorlevel 1 exit /b 1
echo [OK] KURULUM.bat testi basarili. Kurulum veya Discord islemi yapilmadi.
exit /b 0

:node_kontrol
echo [1/6] Node.js ve npm kontrol ediliyor...
where node >nul 2>&1
if not errorlevel 1 (
  node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>20||(a===20&&b>=19)?0:1)"
  if not errorlevel 1 (
    where npm >nul 2>&1
    if not errorlevel 1 (
      for /f "delims=" %%V in ('node --version') do echo       Node.js %%V hazir.
      exit /b 0
    )
  )
  echo       Node.js eski veya npm eksik. Guncel LTS surumu yuklenecek...
) else (
  echo       Node.js bulunamadi. Guncel LTS surumu yuklenecek...
)

call :winget_kontrol
if errorlevel 1 exit /b 1

winget upgrade --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  winget install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements
)

set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js kuruldu fakat bu pencere goremedi.
  echo Bilgisayari yeniden baslatip KURULUM.bat dosyasini tekrar ac.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [HATA] npm bulunamadi. Bilgisayari yeniden baslatip kurulumu tekrarla.
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>20||(a===20&&b>=19)?0:1)"
if errorlevel 1 (
  echo [HATA] Node.js 20.19.0 veya daha yeni bir surum gerekli.
  exit /b 1
)
echo       Node.js ve npm kuruldu.
exit /b 0

:mongodb_kontrol
echo [4/6] MongoDB Server kontrol ediliyor...
sc.exe query MongoDB >nul 2>&1
if not errorlevel 1 (
  call :mongodb_baslat
  if errorlevel 1 exit /b 1
  exit /b 0
)

echo       MongoDB bulunamadi. MongoDB Server yuklenecek...
call :winget_kontrol
if errorlevel 1 exit /b 1

winget install --id MongoDB.Server --exact --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo [HATA] MongoDB Server yuklenemedi.
  exit /b 1
)

rem Winget paketi normalde servisi kurar. Kurmadiysa guvenli yerel servis olustur.
sc.exe query MongoDB >nul 2>&1
if errorlevel 1 call :mongodb_servis_olustur
if errorlevel 1 exit /b 1

call :mongodb_baslat
if errorlevel 1 exit /b 1
exit /b 0

:mongodb_servis_olustur
set "MONGOD_EXE="
for /f "delims=" %%M in ('dir /b /s /a-d "%ProgramFiles%\MongoDB\Server\*\bin\mongod.exe" 2^>nul') do if not defined MONGOD_EXE set "MONGOD_EXE=%%M"
if not defined MONGOD_EXE (
  echo [HATA] MongoDB yuklendi fakat mongod.exe bulunamadi.
  exit /b 1
)

if not exist "%ProgramData%\SesAfkTokenMongoDB\data" mkdir "%ProgramData%\SesAfkTokenMongoDB\data"
if not exist "%ProgramData%\SesAfkTokenMongoDB\logs" mkdir "%ProgramData%\SesAfkTokenMongoDB\logs"

"%MONGOD_EXE%" --install --serviceName MongoDB --serviceDisplayName "MongoDB" --dbpath "%ProgramData%\SesAfkTokenMongoDB\data" --logpath "%ProgramData%\SesAfkTokenMongoDB\logs\mongod.log" --logappend --bind_ip 127.0.0.1 --port 27017
if errorlevel 1 (
  echo [HATA] MongoDB Windows servisi olusturulamadi.
  exit /b 1
)
exit /b 0

:mongodb_baslat
sc.exe query MongoDB | findstr /I "RUNNING" >nul 2>&1
if not errorlevel 1 (
  echo       MongoDB servisi calisiyor.
  exit /b 0
)

echo       MongoDB servisi baslatiliyor...
sc.exe start MongoDB >nul 2>&1
for /L %%I in (1,1,10) do (
  sc.exe query MongoDB | findstr /I "RUNNING" >nul 2>&1
  if not errorlevel 1 (
    echo       MongoDB servisi baslatildi.
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)
echo [HATA] MongoDB servisi baslatilamadi.
exit /b 1

:winget_kontrol
where winget >nul 2>&1
if not errorlevel 1 exit /b 0
echo [HATA] Windows Paket Yoneticisi bulunamadi.
echo Microsoft Store'dan App Installer uygulamasini yukle ve tekrar dene.
start "" "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1"
exit /b 1

:tarayici_kontrol
rem Otomasyon yalnizca Brave ile calisiyor. Chrome, portal sayfasini
rem otomasyona kullandirmadigi icin kapsam disinda tutuldu.
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
  echo       Brave bulundu.
  exit /b 0
)
if exist "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" (
  echo       Brave bulundu.
  exit /b 0
)
if exist "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" (
  echo       Brave bulundu.
  exit /b 0
)
echo       Brave bulunamadi. Brave yuklenecek...
call :winget_kontrol
if errorlevel 1 exit /b 1

winget install --id Brave.Brave --exact --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo [HATA] Brave yuklenemedi.
  exit /b 1
)

if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" goto :brave_kuruldu
if exist "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" goto :brave_kuruldu
if exist "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" goto :brave_kuruldu
echo [HATA] Brave kuruldu fakat brave.exe bulunamadi.
echo Bilgisayari yeniden baslatip KURULUM.bat dosyasini tekrar ac.
exit /b 1

:brave_kuruldu
echo       Brave kuruldu.
exit /b 0

:hata
echo.
echo ========================================================
echo KURULUM TAMAMLANAMADI
echo Yukaridaki hata mesajini kontrol edip kurulumu tekrar ac.
echo ========================================================
if defined TEST_MODU exit /b 1
pause
exit /b 1
