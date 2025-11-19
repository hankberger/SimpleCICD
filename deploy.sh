#!/bin/bash
echo "Starting deployment script..."
cd ~/portfolio/Portfolio2025 || { echo "Failed to change directory to ~/portfolio/Portfolio2025"; exit 1; }

echo "Stopping server with pm2..."
pm2 stop server || { echo "Failed to stop pm2 server. Continuing anyway."; }

echo "Pulling latest changes from git..."
git pull || { echo "Git pull failed"; exit 1; }

echo "Installing npm dependencies..."
npm install || { echo "npm install failed"; exit 1; }

echo "Building the project..."
npm run build || { echo "npm run build failed"; exit 1; }

echo "Starting server with pm2..."
pm2 start server || { echo "Failed to start server with pm2"; exit 1; }

echo "Deployment script finished successfully."
