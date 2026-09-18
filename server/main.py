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

def get_video_id(url: str) -> str:
    # 정규식을 통한 유튜브 ID 추출
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    return None

def format_time(seconds):
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

def chunk_transcript(items, is_whisper=False):
    chunks = []
    current_text = ""
    current_start = 0
    
    for item in items:
        start = item['start'] if isinstance(item, dict) else item.start
        text = item['text'] if isinstance(item, dict) else item.text
        
        if not current_text:
            current_start = start
            
        current_text += text + " "
        
        # 600자 정도마다 하나의 덩어리(청크)로 분리
        if len(current_text) > 600:
            chunks.append({"time": format_time(current_start), "text": current_text.strip()})
            current_text = ""
            
    if current_text:
        chunks.append({"time": format_time(current_start), "text": current_text.strip()})
        
    return chunks

@app.post("/api/youtube")
async def process_youtube(req: YoutubeRequest):
    video_id = get_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="유효하지 않은 유튜브 URL입니다.")
    
    # 1. 먼저 공식 자막(CC) 추출 시도
    try:
        yt_api = YouTubeTranscriptApi()
        transcript = yt_api.fetch(video_id, languages=['ko', 'en', 'en-US', 'en-GB'])
        chunks = chunk_transcript(transcript)
        return {"segments": chunks, "source": "cc"}
    except Exception as e:
        print("공식 자막 가져오기 실패, 오디오 다운로드 및 Whisper 변환으로 넘어갑니다:", str(e))
        pass
        
    # 2. 자막이 없으면 오디오를 다운받아 Whisper(STT) 사용
    file_path = None
    try:
        client = Groq(api_key=req.api_key)
        
        cookies_file = "cookies.txt"
        
        ydl_opts = {
            'format': 'm4a/bestaudio/best',
            'outtmpl': f'temp_{video_id}.%(ext)s',
            'quiet': True,
        }
        
        if os.path.exists(cookies_file):
            ydl_opts['cookiefile'] = cookies_file
            
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([req.url])
        except Exception as e:
            raise Exception(f"오디오 다운로드 실패 (유튜브 봇 차단 발생). cookies.txt를 추출해 server 폴더에 넣어주세요.: {str(e)}")
            
        files = glob.glob(f"temp_{video_id}.*")
        if not files:
            raise Exception("오디오 다운로드에 실패했습니다.")
        file_path = files[0]
        
        if os.path.getsize(file_path) > 25 * 1024 * 1024:
            raise Exception("오디오 파일이 너무 큽니다 (25MB 제한). 더 짧은 영상을 사용해주세요.")
            
        with open(file_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
              file=(file_path, file.read()),
              model="whisper-large-v3",
              response_format="verbose_json"
            )
            
        os.remove(file_path)
        
        # Whisper response has 'segments'
        chunks = chunk_transcript(transcription.segments, is_whisper=True)
        return {"segments": chunks, "source": "whisper"}
        
    except Exception as e:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"오류가 발생했습니다: {str(e)}")

