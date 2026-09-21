import os
import re
import glob
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import yt_dlp
from groq import Groq
import requests
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class YoutubeRequest(BaseModel):
    url: str
    api_key: str
    groq_key: str = "" 

class LlmRequest(BaseModel):
    systemPrompt: str
    userMessage: str
    gemini_key: str
    groq_key: str = ""

def get_video_id(url: str) -> str:
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    raise ValueError("Invalid YouTube URL")

def format_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

@app.post("/api/youtube")
async def process_youtube(req: YoutubeRequest):
    try:
        video_id = get_video_id(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        yt_api = YouTubeTranscriptApi()
        transcript = yt_api.fetch(video_id, languages=['ko', 'en', 'en-US', 'en-GB'])
        chunks = []
        current_text = ""
        current_start = 0
        chunk_length = 0

        for t in transcript:
            text = t['text'].replace('\n', ' ')
            if chunk_length == 0:
                current_start = t['start']
            
            current_text += text + " "
            chunk_length += t['duration']

            if chunk_length >= 60:
                chunks.append({"time": format_time(current_start), "text": current_text.strip()})
                current_text = ""
                chunk_length = 0
        
        if current_text:
            chunks.append({"time": format_time(current_start), "text": current_text.strip()})

        return {"success": True, "source": "cc", "segments": chunks}

    except Exception as e:
        print(f"CC extraction failed, falling back to Whisper: {e}")
        
        if not req.groq_key:
            raise HTTPException(status_code=400, detail="Groq API key required for audio transcription (No CC available)")

        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': f'{video_id}.%(ext)s',
                'quiet': True,
                'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
                }
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(req.url, download=True)
            
            audio_files = glob.glob(f"{video_id}.*")
            if not audio_files:
                raise Exception("Audio download failed")
            
            audio_file = audio_files[0]
            
            if os.path.getsize(audio_file) > 25 * 1024 * 1024:
                os.remove(audio_file)
                raise Exception("오디오 파일이 너무 큽니다 (25MB 제한). 더 짧은 영상을 선택해주세요.")

            client = Groq(api_key=req.groq_key)
            with open(audio_file, "rb") as file:
                transcription = client.audio.transcriptions.create(
                  file=(audio_file, file.read()),
                  model="whisper-large-v3",
                  prompt="Specify context or spelling",
                  response_format="verbose_json"
                )
            
            os.remove(audio_file)
            
            chunks = []
            for segment in transcription.segments:
                chunks.append({
                    "time": format_time(segment['start']),
                    "text": segment['text'].strip()
                })

            return {"success": True, "source": "whisper", "segments": chunks}

        except Exception as ex:
            raise HTTPException(status_code=500, detail=f"오디오 다운로드 실패 (유튜브 봇 차단 발생).: {str(ex)}")

@app.post("/api/llm")
async def process_llm(req: LlmRequest):
    # 1. Try Gemini
    if req.gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={req.gemini_key}"
            payload = {
                "contents": [{"role": "user", "parts": [{"text": req.userMessage}]}],
                "systemInstruction": {"role": "system", "parts": [{"text": req.systemPrompt}]},
                "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
            }
            res = requests.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                text = text.strip()
                if text.startswith('```json'): text = text[7:]
                if text.startswith('```'): text = text[3:]
                if text.endswith('```'): text = text[:-3]
                return {"success": True, "data": json.loads(text.strip()), "source": "gemini"}
            elif res.status_code == 429:
                print("Gemini API limit reached. Falling back to Groq...")
            else:
                print(f"Gemini API Error {res.status_code}: {res.text}. Falling back to Groq...")
        except Exception as e:
            print(f"Gemini API Request Failed: {e}. Falling back to Groq...")

    # 2. Fallback to Groq
    if req.groq_key:
        try:
            client = Groq(api_key=req.groq_key)
            response = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": req.systemPrompt},
                    {"role": "user", "content": req.userMessage}
                ],
                model="llama-3.1-70b-versatile",
                response_format={"type": "json_object"},
            )
            return {"success": True, "data": json.loads(response.choices[0].message.content), "source": "groq"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")
            
    raise HTTPException(status_code=500, detail="Gemini failed and no Groq key provided.")
