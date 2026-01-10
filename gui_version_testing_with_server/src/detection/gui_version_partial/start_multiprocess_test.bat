@echo off
cd /d "%~dp0"
echo ===================================================
echo   ICETUBE MULTIPROCESSING ENGINE (V3) - TEST RUN
echo ===================================================
echo.
echo Running from: %CD%
echo.

:: We are inside gui_version_partial, so we run main.py directly
:: But we need to make sure python usually sees packages from root
:: So we set PYTHONPATH to parent dir (..)
set PYTHONPATH=..;%PYTHONPATH%

python main.py --source "rtsp://foodinesia:tenggarong1@192.168.10.17:554/stream1" --model "bestbaru.engine"
:: Adjust args as needed

echo.
if errorlevel 1 (
    echo [ERROR] Program crash or error.
    pause
) else (
    echo Program Stopped.
)
pause
