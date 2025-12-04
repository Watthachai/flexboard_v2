@echo off
setlocal

REM Default to production
set ENV=%1
if "%ENV%"=="" set ENV=prod

if "%ENV%"=="staging" (
    set ENV_FILE=.env.onprem.staging
    set BACKEND_URL=https://api-staging.fittflexb.com
    echo ==============================================================================
    echo FlexBoard OnPrem Startup Script [STAGING]
    echo ==============================================================================
) else (
    set ENV_FILE=.env.onprem.prod
    set BACKEND_URL=https://api.fittflexb.com
    echo ==============================================================================
    echo FlexBoard OnPrem Startup Script [PRODUCTION]
    echo ==============================================================================
)

echo.
echo This will start:
echo   - Frontend (port 3000) - Dashboard UI
echo   - SQL Proxy (port 5001) - Connects to your SQL Server  
echo.
echo Cloud Backend: %BACKEND_URL%
echo.

REM Check if docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b
)

REM Start containers with environment file
echo [INFO] Building and starting containers...
docker-compose -f docker-compose.onprem.yml --env-file %ENV_FILE% up -d --build

echo.
echo [INFO] Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo ==============================================================================
echo FlexBoard OnPrem is running! [%ENV%]
echo ==============================================================================
echo.
echo   Dashboard: http://localhost:3000
echo   SQL Proxy: http://localhost:5001
echo   Backend:   %BACKEND_URL%
echo.
echo   View logs: docker-compose -f docker-compose.onprem.yml logs -f
echo   Stop:      docker-compose -f docker-compose.onprem.yml down
echo ==============================================================================
echo.
echo Usage:
echo   start-onprem.bat          - Production
echo   start-onprem.bat staging  - Staging
echo ==============================================================================
pause
endlocal
