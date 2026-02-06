@echo off
TITLE IceTube Control Panel
echo Memulai Control Panel...
echo.

cd /d "%~dp0"

echo Running: python src/gui/icetube_control_panel.py
python src/gui/icetube_control_panel.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Terjadi kesalahan saat menjalankan aplikasi (Code: %ERRORLEVEL%).
    pause
)
