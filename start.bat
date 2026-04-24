@echo off
title SDH KUPANG - Sistem Manajemen Keterlambatan
color 0A

echo ================================================
echo   SDH KUPANG - Sistem Manajemen Keterlambatan
echo ================================================
echo.

REM === CEK NODE.JS ===
where node >/dev/null 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Silakan install Node.js dari https://nodejs.org
    pause
    exit /b 1
)

REM === CEK MONGODB ===
echo [1/4] Memeriksa MongoDB...
sc query MongoDB >/dev/null 2>&1
if %errorlevel% equ 0 (
    net start MongoDB >/dev/null 2>&1
    echo       MongoDB service ditemukan dan dijalankan.
) else (
    REM Coba jalankan mongod manual
    where mongod >/dev/null 2>&1
    if %errorlevel% equ 0 (
        echo       Menjalankan mongod...
        start /min cmd /c "mongod --dbpath C:\data\db"
        timeout /t 3 /nobreak >/dev/null
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
    copy "backend\.env.example" "backend\.env" >/dev/null
    echo       .env berhasil dibuat. Edit backend\.env sesuai kebutuhan.
)

REM === JALANKAN SERVER ===
echo [4/4] Menjalankan server...
echo.
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:5173
echo.
echo   Login default: admin / Admin123!
echo.
echo ================================================
echo   Tutup jendela ini untuk menghentikan semua server
echo ================================================
echo.

start "Backend - SDH" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 2 /nobreak >/dev/null
start "Frontend - SDH" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >/dev/null

REM Buka browser otomatis
start http://localhost:5173

echo Semua server berjalan. Browser akan terbuka otomatis.
echo.
pause
