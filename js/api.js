import { getSystemPrompt, getUserPrompt } from './prompts.js';

// API 키는 localStorage에 저장됩니다. 첫 실행 시 자동으로 입력 프롬프트가 표시됩니다.
export function getGroqApiKey() {
  let key = localStorage.getItem('groq_api_key');
  if (!key) {
    key = prompt('Groq API 키를 입력해주세요.\n(https://console.groq.com 에서 무료 발급)');
    if (key) localStorage.setItem('groq_api_key', key);
  }
  return key;
}
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const YOUTUBE_API_URL = 'http://localhost:5000/api/youtube';

// 현재 Groq에서 텍스트 생성용으로 사용 가능한 모델 목록 (우선순위 순)
// 2026-09 Groq 공식 문서 기준 확인 완료
const GROQ_TEXT_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-groq-70b-8192-tool-use-preview',
  'qwen/qwen3.6-27b',
  'qwen/qwen3.8-27b',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

let GROQ_MODEL = null;
async function getGroqModel() {
  if (GROQ_MODEL) return GROQ_MODEL;
  
  // 모델 목록을 하나씩 시도해서 실제 사용 가능한 첫 번째 모델을 선택
  for (const model of GROQ_TEXT_MODELS) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getGroqApiKey()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        })
      });
      if (res.ok) {
        GROQ_MODEL = model;
        console.log("✅ 사용 가능한 Groq 모델 확인:", model);
        return GROQ_MODEL;
      }
      console.warn(`❌ 모델 ${model} 사용 불가, 다음 모델 시도...`);
    } catch (e) {
      console.warn(`❌ 모델 ${model} 연결 실패:`, e.message);
    }
  }
  
  // 모든 모델이 실패하면 에러
  throw new Error('사용 가능한 Groq AI 모델을 찾을 수 없습니다. API 키를 확인해주세요.');
}

export async function callGroq(mode, data, retries = 3) {
  const systemPrompt = getSystemPrompt(mode);
  const userMessage = getUserPrompt(mode, data);
  const modelToUse = await getGroqModel();
  
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getGroqApiKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 800
    })
  });
  
  if (!response.ok) {
    if (response.status === 429 && retries > 0) {
      console.warn(`Rate limit exceeded. Retrying in 3 seconds... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
      return callGroq(mode, data, retries - 1);
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 오류: ${response.status}`);
  }
  
  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e1) {
    try {
      // 1. 마크다운 블록 추출 시도
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      
      // 2. 강제로 처음 '{' 와 마지막 '}' 사이의 문자열만 추출
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const pureJson = content.substring(firstBrace, lastBrace + 1);
        return JSON.parse(pureJson);
      }
      
      throw e1;
    } catch (e2) {
      throw new Error(`AI 데이터 파싱 실패 (${e2.message}). 원본: ${content.substring(0, 50)}...`);
    }
  }
}

export async function lookupDictionary(word) {
  try {
    const response = await fetch(`${DICTIONARY_API_URL}/${encodeURIComponent(word.trim())}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const entry = data[0];
    return {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '',
      audioUrl: entry.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio || '',
      meanings: entry.meanings?.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions?.slice(0, 3).map(d => d.definition) || []
      })) || []
    };
  } catch {
    return null;
  }
}

export async function fetchYoutubeTranscript(url, apiKey) {
  const response = await fetch(YOUTUBE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, api_key: apiKey })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `서버 오류: ${response.status}`);
  }
  return await response.json();
}
