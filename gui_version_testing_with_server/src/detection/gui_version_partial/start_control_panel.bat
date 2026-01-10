@echo off
cd /d "%~dp0"
echo ===================================================
echo   LAUNCHING CONTROL PANEL
echo ===================================================
echo.

:: Go up one level to root folder where icetube_control_panel.py is
cd ..

python icetube_control_panel.py

echo.
pause
