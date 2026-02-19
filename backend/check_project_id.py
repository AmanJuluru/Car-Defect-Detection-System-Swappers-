import json

try:
    with open("serviceAccountKey.json", "r") as f:
        data = json.load(f)
        print(f"Project ID: {data.get('project_id')}")
        print(f"Client Email: {data.get('client_email')}")
except Exception as e:
    print(f"Error reading key: {e}")
