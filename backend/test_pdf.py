from pdf_service import ReportGenerator
import os

print("Testing ReportGenerator...")

# Dummy scan data
scan_data = {
    "id": "test-scan-123",
    "user_email": "test@example.com",
    "company_id": "TEST-CO",
    "date": "2023-10-27",
    "status": "Pending",
    "detections": [
        {"class": "Scratch", "confidence": 0.95, "box": [10, 10, 100, 100]},
        {"label": "Dent", "confidence": 0.88, "box": [150, 150, 200, 200]}
    ],
    "image_url": "http://localhost:8000/uploads/test_image.jpg" # This acts as a placeholder
}

# Create a dummy image for testing if it doesn't exist
if not os.path.exists("uploads"):
    os.makedirs("uploads")
    
from PIL import Image
img = Image.new('RGB', (300, 300), color = 'red')
img.save('uploads/test_image.jpg')

try:
    generator = ReportGenerator()
    pdf_buffer = generator.generate(scan_data)
    
    with open("test_report.pdf", "wb") as f:
        f.write(pdf_buffer.getvalue())
        
    print("PDF generated successfully: test_report.pdf")
except Exception as e:
    print(f"Error generating PDF: {e}")
    import traceback
    traceback.print_exc()
