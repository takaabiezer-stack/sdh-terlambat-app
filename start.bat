@echo off
title SDH KUPANG - Sistem Manajemen Keterlambatan
color 0A

echo ================================================
echo   SDH KUPANG - Sistem Manajemen Keterlambatan
echo ================================================
echo.

REM === CEK NODE.JS ===
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Silakan install Node.js dari https://nodejs.org
    pause
    exit /b 1
)

REM === CEK MONGODB ===
echo [1/4] Memeriksa MongoDB...
sc query MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    net start MongoDB >nul 2>&1
    echo       MongoDB service ditemukan dan dijalankan.
) else (
    where mongod >nul 2>&1
    if %errorlevel% equ 0 (
        echo       Menjalankan mongod...
        start /min cmd /c "mongod --dbpath C:\data\db"
        timeout /t 3 /nobreak >nul
    ) else (
        echo [PERINGATAN] MongoDB tidak ditemukan sebagai service maupun command.
        echo              Pastikan MongoDB sudah terinstall dan dijalankan manual.
    )
)

REM === INSTALL DEPENDENCIES JIKA PERLU ===
echo [2/4] Memeriksa dependensi backend...
if not exist "backend\node_modules" (
    echo       Menginstall... (ini hanya sekali)
    cd backend && npm install --silent && cd ..
) else (
    echo       OK
)

echo [3/4] Memeriksa dependensi frontend...
if not exist "frontend\node_modules" (
    echo       Menginstall... (ini hanya sekali)
    cd frontend && npm install --silent && cd ..
) else (
    echo       OK
)

REM === SETUP .ENV JIKA BELUM ADA ===
if not exist "backend\.env" (
    echo [INFO] File .env tidak ditemukan, membuat dari template...
    copy "backend\.env.example" "backend\.env" >nul
    echo       .env berhasil dibuat.
)

REM === AMBIL IP JARINGAN ===
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCALIP=%%a
    goto :found_ip
)
:found_ip
set LOCALIP=%LOCALIP: =%

REM === JALANKAN SERVER ===
echo [4/4] Menjalankan server...
echo.
echo ================================================
echo   AKSES DI KOMPUTER INI:
echo     http://localhost:5173
echo.
echo   AKSES DARI KOMPUTER LAIN (jaringan sama):
echo     http://%LOCALIP%:5173
echo.
echo   Login: admin / Admin123!
echo ================================================
echo.
echo   Bagikan alamat http://%LOCALIP%:5173 ke komputer lain
echo ================================================
echo.

start "Backend - SDH" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 2 /nobreak >nul
start "Frontend - SDH" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul

REM Buka browser otomatis
start http://localhost:5173

echo Semua server berjalan. Browser akan terbuka otomatis.
echo.
pause
