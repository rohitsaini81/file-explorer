
import boto3
from botocore.client import Config
from dotenv import load_dotenv
import os 
import base64
from io import BytesIO

load_dotenv()

# Replace with your actual credentials and bucket details
ACCESS_KEY = os.getenv("ACCESS_KEY")
SECRET_KEY = os.getenv("SECRET_ACCESS_KEY")
ENDPOINT_URL = os.getenv("ENDPOINT_URL")
BUCKET_NAME = "stylemyspace"  # Replace with your actual bucket name
VIDEO_FILE_PATH = "image.jpg"  # Replace with your actual video file path
BUCKET_PUB_URL="https://pub-3b970c4f17474b5d9332c3d3b922ae95.r2.dev"



# Initialize the S3 client with R2 credentials
s3 = boto3.client(
    "s3",
    endpoint_url=ENDPOINT_URL,  # Cloudflare R2 endpoint
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version="s3v4"),
)


def upload_file_to_cloud(file_path=None, file_bytes=None, bucket_name=BUCKET_NAME, object_name=None):
    """Uploads a video or image file to Cloudflare R2."""

    if object_name is None:
        if file_path:
            object_name = file_path.split("/")[-1]  # Use filename if provided
        else:
            object_name = "uploaded_file"

    try:
        if file_bytes is not None:
            # If file_bytes is base64 string, decode it
            if isinstance(file_bytes, str):
                file_bytes = base64.b64decode(file_bytes)
            # Wrap in BytesIO
            file_like = BytesIO(file_bytes)
            s3.upload_fileobj(file_like, bucket_name, object_name)
        else:
            with open(file_path, "rb") as file:
                s3.upload_fileobj(file, bucket_name, object_name)

        print(f"Upload successful: {object_name} → {bucket_name}")
        # print(f"Access URL: {BUCKET_PUB_URL}/{object_name}")
        return f"{BUCKET_PUB_URL}/{object_name}"

    except Exception as e:
        print("Error uploading file:", e)




def delete_file_from_cloud(file_name, bucket_name=BUCKET_NAME):
    """
    Delete a single file from the specified bucket by file name.
    
    Args:
        file_name: The name/key of the file to delete
        bucket_name: The name of the S3 bucket
    
    Returns:
        "ok" if deletion was successful, error message otherwise
    """
    try:
        # Delete the specific file
        response = s3.delete_object(
            Bucket=bucket_name,
            Key=file_name
        )
        
        print(f"✅ Deleted file: {file_name} from bucket: {bucket_name}")
        return "ok"
    except Exception as e:
        print(f"❌ Error deleting file {file_name}: {e}")
        return f"error: {str(e)}"




def upload_file(file_path):
    """Uploads a file to Cloudflare R2"""
    try:
        bucket_name = BUCKET_NAME
        
        # Extract filename from path
        file_name = os.path.basename(file_path)

        # Upload file
        s3.upload_file(file_path, bucket_name, file_name, ExtraArgs={'ContentType': 'image/png'})

        # Generate Public URL
        # file_url = f"https://{bucket_name}.{os.getenv('R2_ENDPOINT')}/{file_name}"
        file_url = (f"{BUCKET_PUB_URL}/{file_name}")
        file_name = file_url.split("/")[-1]
        print(f"✅ File uploaded successfully: {file_name}")
        print(f"📌 File URL: {file_url}")
        return file_name
    except Exception as e:
        print(f"❌ Upload error: {e}")



