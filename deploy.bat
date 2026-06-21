@echo off
echo ===================================================
echo [DEPLOY] Starting deployment update...
echo ===================================================

echo [DEPLOY] Checking git status...
git status

echo [DEPLOY] Pulling latest code from origin...
git pull

echo [DEPLOY] Rebuilding and restarting containers...
docker compose up -d --build

echo ===================================================
echo [DEPLOY] Deployment completed successfully!
echo ===================================================
pause
