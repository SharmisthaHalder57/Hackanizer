"""
flask_gateway/app.py — Flask BFF gateway
Proxies all /api/* requests to FastAPI running on port 8000.

Why Flask?
- Acts as the single entry point the Vite proxy talks to
- Easy place to add Flask-specific middleware (rate limiting, logging, CSRF, etc.)
- Separates the "web gateway" concern from the "API business logic" concern
"""
import os
import requests
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

FASTAPI_URL = f"http://127.0.0.1:{os.getenv('FASTAPI_PORT', '8000')}"

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])


# ─── Health ────────────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "HackAnizer Flask Gateway"})


# ─── Universal Proxy ────────────────────────────────────────────────────────────
@app.route("/api/<path:path>", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def proxy(path: str):
    """Forward every /api/* request to FastAPI verbatim."""
    if request.method == "OPTIONS":
        # Let CORS handle preflight
        return Response(status=200)

    target_url = f"{FASTAPI_URL}/api/{path}"

    # Forward query params
    params = request.args.to_dict(flat=True)

    # Forward request headers (strip hop-by-hop headers)
    forward_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length", "transfer-encoding", "connection")
    }

    try:
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=forward_headers,
            params=params,
            data=request.get_data(),
            allow_redirects=False,
            timeout=30,
        )
    except requests.exceptions.ConnectionError:
        return jsonify({
            "detail": "FastAPI server is not running. Start it with: python Backend/run.py"
        }), 503
    except requests.exceptions.Timeout:
        return jsonify({"detail": "FastAPI server timed out"}), 504

    # Relay response back to the client
    excluded_headers = {"content-encoding", "transfer-encoding", "connection", "keep-alive"}
    response_headers = [
        (k, v) for k, v in resp.headers.items()
        if k.lower() not in excluded_headers
    ]

    return Response(
        resp.content,
        status=resp.status_code,
        headers=response_headers,
    )


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    print(f"🌐 Flask Gateway → http://{host}:{port}")
    print(f"   Forwarding /api/* → {FASTAPI_URL}/api/*")
    app.run(host=host, port=port, debug=False)
