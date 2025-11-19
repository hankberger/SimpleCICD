const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // Added for webhook signature validation
const bodyParser = require('body-parser'); // Added for parsing raw request body

const app = express();
const port = 5000;

// IMPORTANT: Store your secret securely, e.g., in an environment variable.
// This secret must match the one configured in your GitHub webhook settings.
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// Middleware to parse raw body for signature verification
// GitHub webhooks send 'application/json', so we need to ensure the raw body is available.
app.use(bodyParser.json({
    verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            // Store the raw body on the request object for later use in verification
            req.rawBody = buf.toString(encoding || 'utf8');
        }
    }
}));

// Middleware to validate GitHub webhook signature
function verifyGitHubWebhook(req, res, next) {
    if (!GITHUB_WEBHOOK_SECRET) {
        console.error('GITHUB_WEBHOOK_SECRET is not set. Webhook validation skipped.');
        // For production, you might want to return 500 or 403 here.
        // For now, we allow it to proceed for easier local testing, but it's insecure.
        return next();
    }

    const signature = req.get('X-Hub-Signature-256'); // Get the signature from the header

    // If no signature header, reject the request
    if (!signature) {
        console.warn('Webhook received without X-Hub-Signature-256 header. Rejecting.');
        return res.status(401).send('Unauthorized: Signature header missing.');
    }

    // Ensure the raw body is available
    if (!req.rawBody) {
        console.error('Raw body not available for signature verification. Ensure body-parser is configured correctly.');
        return res.status(500).send('Internal Server Error: Raw body missing.');
    }

    // Extract the hash part (e.g., 'sha256=...')
    const [algo, githubHash] = signature.split('=');

    // Check if the algorithm is SHA256
    if (algo !== 'sha256') {
        console.warn(`Unsupported signature algorithm: ${algo}. Expected sha256. Rejecting.`);
        return res.status(400).send('Bad Request: Unsupported signature algorithm.');
    }

    // Calculate our own HMAC-SHA256 hash
    const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
    hmac.update(req.rawBody, 'utf8'); // Update HMAC with the raw body
    const calculatedHash = hmac.digest('hex'); // Get the hex digest

    // Compare the calculated hash with the one from GitHub using timingSafeEqual to prevent timing attacks
    const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(calculatedHash, 'hex'),
        Buffer.from(githubHash, 'hex')
    );

    if (!isSignatureValid) {
        console.warn('Webhook signature mismatch. Request potentially forged. Rejecting.');
        return res.status(403).send('Forbidden: Invalid signature.');
    }

    // If signatures match, proceed to the next middleware/route handler
    console.log('Webhook signature successfully validated.');
    next();
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Webhook endpoint
// Apply the signature verification middleware before processing the webhook
app.post('/webhook', verifyGitHubWebhook, (req, res) => {
    // Original webhook logic
    const scriptPath = path.join(__dirname, 'deploy.sh');

    if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({ status: 'error', message: 'deploy.sh script not found' });
    }

    try {
        // Ensure the script is executable
        fs.chmodSync(scriptPath, '755');

        const deploy = spawn('bash', [scriptPath]);

        // Optional: Log output for debugging
        deploy.stdout.on('data', (data) => {
            console.log(`Deployment script stdout: ${data}`);
        });

        deploy.stderr.on('data', (data) => {
            console.error(`Deployment script stderr: ${data}`);
        });

        deploy.on('close', (code) => {
            console.log(`Deployment script exited with code ${code}`);
        });

        res.status(202).json({ status: 'success', message: 'Deployment script started' });
    } catch (error) {
        console.error(`Error executing script: ${error}`);
        res.status(500).json({ status: 'error', message: `An error occurred: ${error.message}` });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Webhook server listening on http://0.0.0.0:${port}`);
    console.log('Remember to set GITHUB_WEBHOOK_SECRET environment variable for webhook validation.');
});
