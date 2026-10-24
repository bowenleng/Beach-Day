from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import TOKEN_KEY
from pydantic import BaseModel
from google import genai

startPrompt = "[TBA], do not include any formatting in your response. Please respond with a single paragraph that is concise and to the point. Do not include any additional commentary or explanations. Please respond in the same language as the input message."

class ChatMessage(BaseModel):
    message: str

app = FastAPI()
client = genai.Client(api_key=TOKEN_KEY) # Initialize the Google GenAI client

# Enable CORS so your React frontend can access this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Hello, World!"}

@app.post("/chat")
def receive_data(payload: ChatMessage):
    msg = payload.message
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=msg
    ).text
    return {"response": response}