@echo off
title SDH KUPANG - Setup Awal
color 0B

echo ================================================
echo   SDH KUPANG - Setup Pertama Kali
echo ================================================
echo.

REM === CEK NODE.JS ===
where node >/dev/null 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Silakan install Node.js dari https://nodejs.org lalu jalankan ulang.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Node.js versi: %%i

REM === INSTALL BACKEND ===
echo.
echo [1/3] Install dependensi backend...
cd backend
npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install backend gagal & pause & exit /b 1 )
cd ..

REM === INSTALL FRONTEND ===
echo.
echo [2/3] Install dependensi frontend...
cd frontend
npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install frontend gagal & pause & exit /b 1 )
cd ..

REM === BUAT .ENV ===
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >/dev/null
    echo.
    echo [INFO] File backend\.env dibuat dari template.
    echo        Edit file backend\.env sesuai konfigurasi Anda sebelum melanjutkan.
    echo        Minimal ubah: MONGODB_URI dan JWT_SECRET
    echo.
    pause
)

REM === SEED DATABASE ===
echo.
echo [3/3] Mengisi data awal (roles, admin, pengaturan, sanksi)...
cd backend
npm run seed
if %errorlevel% neq 0 ( echo [ERROR] Seed database gagal. Pastikan MongoDB berjalan. & pause & exit /b 1 )
cd ..

echo.
echo ================================================
echo   Setup selesai!
echo ================================================
echo.
echo   Sekarang jalankan: start.bat
echo   Login: admin / Admin123!
echo.
pause
