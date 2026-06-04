from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import os

from database import save_user, get_all_users

app = FastAPI(title="Face Scanner Login Service")

# Allow CORS for the frontend React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    username: str
    name: str
    image_base64: str

class LoginRequest(BaseModel):
    image_base64: str

def decode_image(base64_string: str) -> np.ndarray:
    """Decodes a base64 string to an OpenCV image."""
    try:
        # Remove header if present (e.g., 'data:image/jpeg;base64,')
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        img_data = base64.b64decode(base64_string)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

# Load OpenCV DNN Face Models
detector = cv2.FaceDetectorYN.create(
    "face_detection_yunet.onnx", "", (320, 320), 0.9, 0.3, 5000
)
recognizer = cv2.FaceRecognizerSF.create(
    "face_recognition_sface.onnx", ""
)

def get_face_embedding(img: np.ndarray) -> list:
    """Uses OpenCV SFace to extract the embedding vector of the face."""
    try:
        height, width, _ = img.shape
        detector.setInputSize((width, height))
        
        _, faces = detector.detect(img)
        
        if faces is None or len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected in the image.")
        if len(faces) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected. Please ensure only one face is visible.")
        
        # Align and extract feature
        face = faces[0]
        aligned_face = recognizer.alignCrop(img, face)
        feature = recognizer.feature(aligned_face)
        return feature[0].tolist()
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Face recognition error: {str(e)}")

def cosine_similarity(vec1: list, vec2: list) -> float:
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

@app.post("/register")
async def register(req: RegisterRequest):
    img = decode_image(req.image_base64)
    embedding = get_face_embedding(img)
    
    success = save_user(req.username, req.name, embedding)
    if not success:
        raise HTTPException(status_code=400, detail="Username already exists.")
    
    return {"message": f"Successfully registered user: {req.username}"}

@app.post("/login")
async def login(req: LoginRequest):
    img = decode_image(req.image_base64)
    login_embedding = get_face_embedding(img)
    
    users = get_all_users()
    if not users:
        raise HTTPException(status_code=404, detail="No users registered in the database.")

    best_match = None
    highest_similarity = -1.0
    
    # OpenCV SFace threshold is typically 0.363 for Cosine Distance, which corresponds to roughly 0.637 for Cosine Similarity.
    # Let's use 0.65 as a safe threshold for match.
    THRESHOLD = 0.65 

    for user in users:
        sim = cosine_similarity(login_embedding, user["face_encoding"])
        if sim > highest_similarity:
            highest_similarity = sim
            best_match = user
            
    if best_match and highest_similarity >= THRESHOLD:
        return {
            "message": "Login successful", 
            "user": {
                "username": best_match["username"],
                "name": best_match["name"]
            },
            "confidence": round(highest_similarity * 100, 2)
        }
    else:
        raise HTTPException(status_code=401, detail="Face not recognized or match confidence too low.")
