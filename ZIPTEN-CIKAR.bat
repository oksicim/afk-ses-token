@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Ses AFK Token - Masaustune Cikar

set "TEST_MODU="
if /I "%~1"=="--test" set "TEST_MODU=1"

set "SAT_REPO=https://github.com/oksicim/afk-ses-token/archive/refs/heads/main.zip"
set "SAT_ZIP="
set "SAT_INDIRILEN="
set "SAT_GECICI=%TEMP%\SesAfkTokenCikar"
set "SAT_ACILAN=%SAT_GECICI%\acilan"

echo.
echo ========================================================
echo          SES AFK TOKEN - MASAUSTUNE CIKARMA
echo ========================================================
echo Dosyalar masaustune cikarilir, klasor otomatik acilir.
echo Bu pencereyi kapatma.
echo.

rem Onceki yarim kalmis denemeler kullanicinin ZIP'i sanilmasin.
if exist "%SAT_GECICI%" rmdir /s /q "%SAT_GECICI%" >nul 2>&1

rem ---------------------------------------------------------
echo [1/4] Masaustu klasoru bulunuyor...
set "SAT_MASAUSTU="
for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')" 2^>nul`) do set "SAT_MASAUSTU=%%D"
if not defined SAT_MASAUSTU set "SAT_MASAUSTU=%USERPROFILE%\Desktop"
if not exist "%SAT_MASAUSTU%" (
  echo [HATA] Masaustu klasoru bulunamadi.
  goto :hata
)
echo       %SAT_MASAUSTU%

set "SAT_HEDEF=%SAT_MASAUSTU%\Ses-AFK-Token"

rem Kurulu surumun ayarlarini asla ezme. config.js bot tokenini tutuyor.
if exist "%SAT_HEDEF%\config.js" (
  echo.
  echo Masaustunde zaten kurulu bir surum var.
  echo Ayarlarin ve tokenin silinmesin diye uzerine yazilmadi.
  if defined TEST_MODU exit /b 0
  call :klasoru_ac "%SAT_HEDEF%"
  echo.
  pause
  exit /b 0
)

rem Yarim kalmis bir cikarma varsa yanina numarali klasor ac.
if exist "%SAT_HEDEF%" (
  for /L %%N in (2,1,50) do (
    if not exist "%SAT_MASAUSTU%\Ses-AFK-Token-%%N" (
      set "SAT_HEDEF=%SAT_MASAUSTU%\Ses-AFK-Token-%%N"
      goto :hedef_hazir
    )
  )
  echo [HATA] Masaustunde bos klasor ismi bulunamadi.
  goto :hata
)
:hedef_hazir

rem ---------------------------------------------------------
echo.
echo [2/4] ZIP dosyasi araniyor...
for /f "usebackq delims=" %%Z in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$y=@(); foreach($k in @(($env:USERPROFILE+'\Downloads'),($env:USERPROFILE+'\Desktop'),($env:USERPROFILE+'\OneDrive\Desktop'),($env:USERPROFILE+'\OneDrive\Masaustu'),$env:TEMP)){ if(Test-Path -LiteralPath $k){ $y+=@(Get-ChildItem -LiteralPath $k -Filter '*.zip' -File -Recurse -Depth 1 -ErrorAction SilentlyContinue) } }; $en=$null; foreach($f in $y){ $n=$f.Name.ToLower(); if($n.Contains('afk') -or $n.Contains('token') -or $n.Contains('ses')){ if(($en -eq $null) -or ($f.LastWriteTime -gt $en.LastWriteTime)){ $en=$f } } }; if($en){$en.FullName}" 2^>nul`) do set "SAT_ZIP=%%Z"

if defined SAT_ZIP (
  echo       Bulundu: %SAT_ZIP%
) else (
  echo       Bilgisayarda ZIP bulunamadi. GitHub'dan indirilecek.
)

rem ---------------------------------------------------------
echo.
echo [3/4] Dosyalar hazirlaniyor...

if defined TEST_MODU goto :test_modu

if not exist "%SAT_GECICI%" mkdir "%SAT_GECICI%" >nul 2>&1

if not defined SAT_ZIP (
  set "SAT_INDIRILEN=%SAT_GECICI%\ses-afk-token.zip"
  echo       Indiriliyor...
  curl.exe -L --fail --retry 2 --retry-delay 2 --progress-bar -o "%SAT_GECICI%\ses-afk-token.zip" "%SAT_REPO%"
  if errorlevel 1 (
    echo       curl basarisiz. PowerShell ile tekrar deneniyor...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri $env:SAT_REPO -OutFile ($env:SAT_GECICI+'\ses-afk-token.zip') -UseBasicParsing"
    if errorlevel 1 (
      echo [HATA] Dosyalar indirilemedi.
      echo Internet baglantini kontrol edip bu dosyayi tekrar ac.
      goto :hata
    )
  )
  set "SAT_ZIP=%SAT_GECICI%\ses-afk-token.zip"
  echo       Indirme tamamlandi.
)

echo       Cikariliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:SAT_ZIP -DestinationPath $env:SAT_ACILAN -Force; $k=@(Get-ChildItem -LiteralPath $env:SAT_ACILAN -Recurse -Filter 'KURULUM.bat' -File -ErrorAction SilentlyContinue); if($k.Count -eq 0){ throw 'ZIP icinde KURULUM.bat yok. Yanlis dosya secilmis olabilir.' }; Move-Item -LiteralPath $k[0].Directory.FullName -Destination $env:SAT_HEDEF"
if errorlevel 1 (
  echo [HATA] ZIP cikarilamadi.
  echo Dosya bozuk olabilir veya yanlis ZIP secilmis olabilir.
  goto :hata
)

if not exist "%SAT_HEDEF%\KURULUM.bat" (
  echo [HATA] Dosyalar cikarildi fakat KURULUM.bat bulunamadi.
  goto :hata
)

rmdir /s /q "%SAT_GECICI%" >nul 2>&1

rem ---------------------------------------------------------
echo.
echo [4/4] TAMAMLANDI.
echo.
echo Dosyalar burada:
echo   %SAT_HEDEF%
echo.
call :klasoru_ac "%SAT_HEDEF%"

echo.
choice /C EH /N /M "Kurulumu simdi baslatmak ister misin? (E = Evet, H = Hayir): "
if errorlevel 2 goto :bitti
echo.
echo Kurulum baslatiliyor...
start "" "%SAT_HEDEF%\KURULUM.bat"
exit /b 0

:bitti
echo.
echo Hazir oldugunda acilan klasordeki KURULUM.bat dosyasina cift tikla.
echo.
pause
exit /b 0

rem ---------------------------------------------------------
:test_modu
echo [TEST] Cikarma veya indirme yapilmadi.
where curl.exe >nul 2>&1
if errorlevel 1 (
  echo [UYARI] curl.exe bulunamadi. PowerShell yedegi kullanilacak.
) else (
  echo       curl.exe hazir.
)
powershell -NoProfile -Command "if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo [HATA] Expand-Archive komutu yok. Windows 10 veya 11 gerekli.
  exit /b 1
)
echo       Expand-Archive hazir.
echo       Hedef klasor: %SAT_HEDEF%
echo [OK] ZIPTEN-CIKAR.bat testi basarili.
exit /b 0

rem ---------------------------------------------------------
:klasoru_ac
if exist "%~1\KURULUM.bat" (
  start "" explorer.exe /select,"%~1\KURULUM.bat"
) else (
  start "" explorer.exe "%~1"
)
exit /b 0

rem ---------------------------------------------------------
:hata
echo.
echo ========================================================
echo ISLEM TAMAMLANAMADI
echo Yukaridaki hata mesajini kontrol edip tekrar dene.
echo ========================================================
if defined TEST_MODU exit /b 1
pause
exit /b 1
