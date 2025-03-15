import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import qrcode
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from pymongo import MongoClient
import random
import os
import datetime
from fastapi import FastAPI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.makedirs("qrcodes", exist_ok=True)

app = FastAPI()

# MongoDB Connection
MONGO_URI = "mongodb+srv://infest2k25:infest2k25test@infest-2k25.3mv5l.mongodb.net/?retryWrites=true&w=majority&appName=INFEST-2K25"
try:
    client = MongoClient(MONGO_URI)
    db = client["infest_db"]
    collection = db["registrations"]
    logger.info("Connected to MongoDB Atlas")
except Exception as e:
    logger.error(f"MongoDB Connection Error: {e}")
    raise

# Email Configuration
EMAIL_USER = "infest2k25@gmail.com"
EMAIL_PASS = "rmac uddi oxbj qaxa"

# Enable CORS - Update this part in server.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class RegistrationData(BaseModel):
    name: str
    email: str
    phone: str
    whatsapp: str
    college: str
    year: str
    department: str
    events: list
    payment_mode: str

class StatusUpdateData(BaseModel):
    ticket_id: str
    status_type: str  # "paid" or "attended"

# Function to Generate Ticket ID
def generate_ticket_id():
    return f"INF25-{random.randint(1000, 9999)}"

# Function to Generate QR Code
def generate_qr(ticket_id):
    qr = qrcode.make(ticket_id)
    qr_path = f"qrcodes/{ticket_id}.png"
    os.makedirs(os.path.dirname(qr_path), exist_ok=True)
    qr.save(qr_path)
    return qr_path

# Function to Send Confirmation Email
def send_email(user_email, ticket_id, qr_path, user_data):
    msg = MIMEMultipart()
    msg["From"] = EMAIL_USER
    msg["To"] = user_email
    msg["Subject"] = "INFEST 2K25 - Registration Confirmation"

    body = f"""
    <h2>Thank you for registering for INFEST 2K25!</h2>
    <p>Your ticket ID: <b>{ticket_id}</b></p>
    <p>Full Name: {user_data['name']}</p>
    <p>Email: {user_data['email']}</p>
    <p>Phone: {user_data['phone']}</p>
    <p>WhatsApp: {user_data['whatsapp']}</p>
    <p>College: {user_data['college']}</p>
    <p>Year: {user_data['year']}</p>
    <p>Department: {user_data['department']}</p>
    <p>Events: {', '.join(user_data['events'])}</p>
    <p>Payment Mode: {user_data['payment_mode']}</p>
    <p>Show the attached QR code at the event check-in.</p>
    """
    msg.attach(MIMEText(body, "html"))

    with open(qr_path, "rb") as f:
        img = MIMEImage(f.read(), name=f"{ticket_id}.png")
        msg.attach(img)

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, user_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print("Email Error:", e)
        return False

# API Routes

# Registration Route
@app.post("/register")
async def register_user(data: RegistrationData):
    ticket_id = generate_ticket_id()
    qr_path = generate_qr(ticket_id)

    user_data = data.dict()
    user_data["ticket_id"] = ticket_id
    user_data["registration_date"] = datetime.datetime.now()
    user_data["payment_status"] = "pending" if data.payment_mode == "offline" else "paid"
    user_data["attended"] = False
    
    try:
        collection.insert_one(user_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    email_sent = send_email(data.email, ticket_id, qr_path, user_data)

    return {"status": "success", "ticket_id": ticket_id, "qr_code": qr_path, "email_sent": email_sent}

# Get Participant Details Route
@app.get("/participant/{ticket_id}")
async def get_participant(ticket_id: str):
    try:
        participant = collection.find_one({"ticket_id": ticket_id})
        
        if participant:
            # Convert ObjectId to string for JSON serialization
            participant["_id"] = str(participant["_id"])
            
            # Format registration date
            if "registration_date" in participant:
                participant["registration_date"] = participant["registration_date"].strftime("%Y-%m-%d %H:%M:%S")
            
            return {"status": "success", "participant": participant}
        else:
            return {"status": "error", "message": "Participant not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

# Update Participant Status Route
@app.post("/update-status")
async def update_status(data: StatusUpdateData):
    try:
        update_data = {}
        
        if data.status_type == "paid":
            update_data["payment_status"] = "paid"
        elif data.status_type == "attended":
            update_data["attended"] = True
        else:
            raise HTTPException(status_code=400, detail="Invalid status type")

        result = collection.update_one({"ticket_id": data.ticket_id}, {"$set": update_data})

        if result.matched_count == 0:
            return {"status": "error", "message": "Participant not found"}
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    
@app.get("/")
def read_root():
    return {"message": "Welcome to INFEST 2K25 Scanner API"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))  # Default to 10000 if PORT is not set
    uvicorn.run(app, host="0.0.0.0", port=port)