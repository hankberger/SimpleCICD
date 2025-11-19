# Simple CI/CD Webhook Server (Node.js)

This project provides a simple web server using Node.js and Express to act as a webhook for CI/CD automation. It exposes endpoints to trigger a deployment script and to check the health of the server.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Customize the deployment script:**
    The `deploy.sh` script contains the commands to update and restart your project. Make sure to customize it for your project's needs. The current script is configured for a Node.js project managed with `pm2`.

## Running the Server

To start the webhook server, run:
```bash
npm start
```
or
```bash
node server.js
```
The server will start on `http://0.0.0.0:5000`.

## Endpoints

*   **Health Check:**
    *   **URL:** `/health`
    *   **Method:** `GET`
    *   **Description:** Use this endpoint to check if the webhook server is running.
    *   **Success Response:**
        ```json
        {
          "status": "ok"
        }
        ```

*   **Webhook Trigger:**
    *   **URL:** `/webhook`
    *   **Method:** `POST`
    *   **Description:** Trigger this endpoint to run the `deploy.sh` script and deploy your project.
    *   **Success Response:**
        ```json
        {
          "status": "success",
          "message": "Deployment script started"
        }
        ```

## Security Note
For a production environment, it is highly recommended to secure your webhook endpoint. You can do this by:
*   Using middleware to require a secret token in the request headers (e.g., `X-Hub-Signature` for GitHub, `X-Gitlab-Token` for GitLab).
*   Verifying the IP address of the request source to ensure it's coming from your Git provider.