from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify the server is running.
    """
    return jsonify({"status": "ok"}), 200

@app.route('/webhook', methods=['POST'])
def webhook():
    """
    Webhook endpoint to trigger the deployment script.
    """
    # For security, you might want to add a secret token check here
    # For example, checking a header like 'X-Gitlab-Token' or 'X-Hub-Signature'
    
    script_path = os.path.join(os.path.dirname(__file__), 'deploy.sh')
    
    if not os.path.exists(script_path):
        return jsonify({"status": "error", "message": "deploy.sh script not found"}), 500

    try:
        # Make the script executable
        subprocess.run(['chmod', '+x', script_path], check=True)
        # Run the deployment script
        subprocess.Popen([script_path])
        return jsonify({"status": "success", "message": "Deployment script started"}), 202
    except subprocess.CalledProcessError as e:
        return jsonify({"status": "error", "message": f"Failed to make script executable: {e}"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": f"An error occurred: {e}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
