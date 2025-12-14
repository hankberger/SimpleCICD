const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

const SERVER_DIR = path.join(__dirname, 'server', 'allthemods');
const NEOFORGE_VERSION = '21.1.215';
const SHUTDOWN_TIMEOUT = 60000; // 60 seconds for graceful shutdown

let serverProcess = null;
let isShuttingDown = false;

function getJavaCommand() {
  return process.env.ATM10_JAVA || 'java';
}

function startMinecraftServer() {
  if (serverProcess || isShuttingDown) {
    return null;
  }

  const userArgsFile = path.join(SERVER_DIR, 'user_jvm_args.txt');
  const neoforgeArgsFile = path.join(SERVER_DIR, 'libraries', 'net', 'neoforged', 'neoforge', NEOFORGE_VERSION, 'win_args.txt');

  // Use Java's @file syntax to read arguments from files
  const args = [`@${userArgsFile}`, `@${neoforgeArgsFile}`, 'nogui'];

  console.log(`[${new Date().toISOString()}] Starting Minecraft server...`);

  serverProcess = spawn(getJavaCommand(), args, {
    cwd: SERVER_DIR,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(`[MC] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(`[MC ERR] ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`[${new Date().toISOString()}] Minecraft server exited with code ${code}`);
    serverProcess = null;
    isShuttingDown = false;
  });

  serverProcess.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, err.message);
    serverProcess = null;
    isShuttingDown = false;
  });

  return serverProcess;
}

function stopMinecraftServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve(true);
      return;
    }

    isShuttingDown = true;
    console.log(`[${new Date().toISOString()}] Sending stop command to server...`);

    const timeoutId = setTimeout(() => {
      if (serverProcess) {
        console.log(`[${new Date().toISOString()}] Graceful shutdown timed out, force killing...`);
        serverProcess.kill('SIGKILL');
      }
      resolve(false);
    }, SHUTDOWN_TIMEOUT);

    serverProcess.once('close', () => {
      clearTimeout(timeoutId);
      resolve(true);
    });

    // Send the stop command to Minecraft server stdin
    serverProcess.stdin.write('stop\n');
  });
}

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'minecraft-restart!') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ error: 'Server is shutting down' });
  }

  if (serverProcess) {
    return res.json({ message: 'Server is already running' });
  }

  const proc = startMinecraftServer();
  if (proc) {
    res.json({ message: 'Server started' });
  } else {
    res.status(500).json({ error: 'Failed to start server' });
  }
});

app.get('/stop', async (req, res) => {
  if (!serverProcess) {
    return res.json({ message: 'Server is not running' });
  }

  if (isShuttingDown) {
    return res.status(503).json({ error: 'Server is already shutting down' });
  }

  const graceful = await stopMinecraftServer();
  if (graceful) {
    res.json({ message: 'Server stopped gracefully' });
  } else {
    res.json({ message: 'Server force killed after timeout' });
  }
});

app.get('/restart', async (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ error: 'Server is already shutting down' });
  }

  if (serverProcess) {
    console.log(`[${new Date().toISOString()}] Restart requested, stopping server first...`);
    const graceful = await stopMinecraftServer();
    console.log(`[${new Date().toISOString()}] Server stopped (graceful: ${graceful}), starting...`);
  }

  const proc = startMinecraftServer();
  if (proc) {
    res.json({ message: 'Server restarted' });
  } else {
    res.status(500).json({ error: 'Failed to restart server' });
  }
});

app.get('/health', (req, res) => {
  res.json({ message: 'Hello' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMinecraftServer();
});
