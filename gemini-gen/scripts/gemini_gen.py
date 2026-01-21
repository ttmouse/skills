import argparse
import os
import sys
import json
import requests
import subprocess
import uuid
from pathlib import Path
from datetime import datetime

# OAuth Configuration (from Alma's antigravity-auth plugin)
CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com'
CLIENT_SECRET = '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'
TOKEN_URL = 'https://oauth2.googleapis.com/token'

# Antigravity Endpoints
ENDPOINTS = [
    'https://daily-cloudcode-pa.sandbox.googleapis.com',
    'https://autopush-cloudcode-pa.sandbox.googleapis.com',
    'https://cloudcode-pa.googleapis.com',
]

# Headers used by the Antigravity plugin
HEADERS_TEMPLATE = {
    'User-Agent': 'antigravity/1.11.5 windows/amd64',
    'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
    'Client-Metadata': '{"ideType":"IDE_UNSPECIFIED","platform":"PLATFORM_UNSPECIFIED","pluginType":"GEMINI"}',
    'Content-Type': 'application/json'
}

# Alma Plugin Storage Path
SECRETS_PATH = os.path.expanduser("~/Library/Application Support/alma/plugin-storage/antigravity-auth/secrets.json")

def get_native_tokens():
    if not os.path.exists(SECRETS_PATH):
        raise Exception(f"Alma Antigravity secrets not found.")
    with open(SECRETS_PATH, 'r') as f:
        data = json.load(f)
    accounts_data = json.loads(data.get("antigravity_accounts", "{}"))
    accounts = accounts_data.get("accounts", [])
    if not accounts:
        raise Exception("No Antigravity accounts connected.")
    return accounts[0].get("refreshToken"), accounts[0].get("projectId")

def refresh_access_token(refresh_token):
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }
    response = requests.post(TOKEN_URL, data=payload)
    response.raise_for_status()
    return response.json().get("access_token")

def generate_image_native(prompt, model_id='gemini-3-pro-image', output_file=None, auto_open=True):
    try:
        refresh_token, project_id = get_native_tokens()
        access_token = refresh_access_token(refresh_token)
        
        # Determine Aspect Ratio
        clean_id = model_id.split(':')[-1].lower()
        aspect_ratio = '1:1'
        if clean_id.endswith('-16x9'): aspect_ratio = '16:9'
        elif clean_id.endswith('-9x16'): aspect_ratio = '9:16'
        
        # 3. Build Gemini Request
        gemini_request = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "imageConfig": {
                    "aspectRatio": aspect_ratio
                }
            },
            "sessionId": f"alma-gen-{int(datetime.now().timestamp())}"
        }
        
        # 4. Wrap in Antigravity Envelope
        # Note: Effective model for image variants is always 'gemini-3-pro-image'
        antigravity_body = {
            "project": project_id,
            "model": "gemini-3-pro-image",
            "request": gemini_request,
            "userAgent": "antigravity",
            "requestId": str(uuid.uuid4())
        }
        
        # 5. Build Headers
        headers = HEADERS_TEMPLATE.copy()
        headers['Authorization'] = f'Bearer {access_token}'
        
        print(f"Requesting generation (Native) for model '{model_id}' (Project: {project_id})...")
        
        # 6. Try endpoints (stable first)
        response = None
        for endpoint in reversed(ENDPOINTS):
            url = f"{endpoint}/v1internal:generateContent"
            try:
                res = requests.post(url, headers=headers, json=antigravity_body, timeout=60)
                if res.ok:
                    response = res
                    break
            except:
                continue
                
        if not response:
            print("❌ All Antigravity endpoints failed.")
            return

        resp_json = response.json()
        
        # 7. Unwrap and process
        inner_resp = resp_json.get("response", resp_json)
        candidates = inner_resp.get("candidates", [])
        
        for candidate in candidates:
            parts = candidate.get("content", {}).get("parts", [])
            for part in parts:
                inline_data = part.get("inlineData")
                if inline_data and inline_data.get("mimeType", "").startswith('image/'):
                    import base64
                    image_bytes = base64.b64decode(inline_data.get("data"))
                    
                    if not output_file:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        ext = inline_data.get("mimeType").split('/')[-1]
                        output_file = f"gemini_native_{timestamp}.{ext}"

                    with open(output_file, 'wb') as f:
                        f.write(image_bytes)
                    
                    print(f"✅ SUCCESS_IMAGE_PATH: {output_file}")
                    if auto_open and sys.platform == "darwin":
                        subprocess.run(["open", output_file])
                        print(f"🚀 Image opened in Preview.")
                    return

        print("❌ Error: No image data in response.")

    except Exception as e:
        print(f"❌ Native generation failed: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt")
    parser.add_argument("--model", default="gemini-3-pro-image")
    parser.add_argument("--output", default=None)
    parser.add_argument("--no-open", action="store_false", dest="auto_open")
    args = parser.parse_args()
    generate_image_native(args.prompt, args.model, args.output, args.auto_open)
