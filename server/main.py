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

@app.post("/api/youtube")
async def process_youtube(req: YoutubeRequest):
    video_id = get_video_id(req.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="유효하지 않은 유튜브 URL입니다.")
    
    # 1. 먼저 공식 자막(CC) 추출 시도
    try:
        # 영어 자막 시도
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB'])
        formatter = TextFormatter()
        text = formatter.format_transcript(transcript)
        # 줄바꿈을 공백으로 변경하여 긴 텍스트로 합침
        text = text.replace('\n', ' ')
        return {"transcript": text, "source": "cc"}
    except Exception as e:
        print("공식 자막 가져오기 실패, 오디오 다운로드 및 Whisper 변환으로 넘어갑니다:", str(e))
        pass
        
    # 2. 자막이 없으면 오디오를 다운받아 Whisper(STT) 사용
    file_path = None
    try:
        client = Groq(api_key=req.api_key)
        
        # yt-dlp를 사용해 오디오 포맷으로 다운로드 (ffmpeg 불필요하도록 m4a 등 원본 유지)
        ydl_opts = {
            'format': 'm4a/bestaudio/best',
            'outtmpl': f'temp_{video_id}.%(ext)s',
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([req.url])
            
        # 다운로드된 파일 찾기
        files = glob.glob(f"temp_{video_id}.*")
        if not files:
            raise Exception("오디오 다운로드에 실패했습니다.")
        file_path = files[0]
        
        # 파일 용량 체크 (Groq Whisper 25MB 제한)
        if os.path.getsize(file_path) > 25 * 1024 * 1024:
            raise Exception("오디오 파일이 너무 큽니다 (25MB 제한). 더 짧은 영상을 사용해주세요.")
            
        # Groq Whisper 호출
        with open(file_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
              file=(file_path, file.read()),
              model="whisper-large-v3",
            )
            
        # 작업 완료 후 파일 삭제
        os.remove(file_path)
        
        return {"transcript": transcription.text, "source": "whisper"}
        
    except Exception as e:
        # 에러 발생 시 임시 파일 정리
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"오류가 발생했습니다: {str(e)}")
