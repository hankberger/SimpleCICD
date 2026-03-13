#!/bin/bash
echo "Starting CreativeFellowshipArtifact deployment..."
cd ~/CreativeFellowshipArtifact || { echo "Failed to change directory to ~/CreativeFellowshipArtifact"; exit 1; }

echo "Stopping server with pm2..."
pm2 stop cfa-server || { echo "pm2 stop failed. Continuing anyway (may be first deploy)."; }

echo "Pulling latest changes from git..."
git pull || { echo "Git pull failed"; exit 1; }

echo "Installing npm dependencies..."
npm install || { echo "npm install failed"; exit 1; }

echo "Cleaning old build artifacts..."
rm -rf dist dist-server

echo "Building the project (frontend + backend)..."
npm run build || { echo "npm run build failed"; exit 1; }

echo "Starting server with pm2..."
pm2 start dist-server/server.js --name cfa-server || { echo "Failed to start server with pm2"; exit 1; }

echo "CreativeFellowshipArtifact deployment finished successfully."
