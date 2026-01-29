
import urllib.request
import urllib.parse
import json
import os
import mimetypes
import uuid

# Helper to create multipart form data
def encode_multipart_formdata(fields, files):
    boundary = uuid.uuid4().hex.encode('utf-8')
    body = bytearray()

    for key, value in fields.items():
        body.extend(b'--' + boundary + b'\r\n')
        body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode('utf-8'))
        body.extend(str(value).encode('utf-8') + b'\r\n')

    for key, (filename, content) in files.items():
        body.extend(b'--' + boundary + b'\r\n')
        body.extend(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode('utf-8'))
        body.extend(b'Content-Type: image/jpeg\r\n\r\n')
        body.extend(content)
        body.extend(b'\r\n')

    body.extend(b'--' + boundary + b'--\r\n')
    content_type = f"multipart/form-data; boundary={boundary.decode('utf-8')}"
    return content_type, body

# Create a dummy image content
image_content = os.urandom(1024)

url = "http://localhost:8000/api/v1/save_scan"
fields = {
    'detections': json.dumps([{"class": "scratch", "confidence": 0.9, "bbox": [0,0,10,10]}]),
    'user_email': 'test@example.com',
    'status': 'Attention'
}
files = {'file': ('test_image.jpg', image_content)}

try:
    content_type, body = encode_multipart_formdata(fields, files)
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Content-Type', content_type)
    
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.status}")
        print(f"Response: {response.read().decode('utf-8')}")

except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(f"Response: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
