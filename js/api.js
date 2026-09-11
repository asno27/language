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

let GROQ_MODEL = null;
async function getGroqModel() {
  if (GROQ_MODEL) return GROQ_MODEL;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${getGroqApiKey()}` }
    });
    const data = await response.json();
    const models = data.data.map(m => m.id);
    
    GROQ_MODEL = models.find(m => m.includes('llama-3.3-70b')) ||
                 models.find(m => m.includes('llama-3.1-8b')) ||
                 models.find(m => m.includes('llama-3.2')) ||
                 models.find(m => m.includes('llama3-70b')) ||
                 models.find(m => m.includes('mixtral')) ||
                 models.find(m => m.includes('llama')) ||
                 models[0];
    console.log("자동 선택된 Groq 모델:", GROQ_MODEL);
    return GROQ_MODEL;
  } catch (e) {
    console.error("모델 목록 가져오기 실패", e);
    return 'llama3-8b-8192'; // Fallback
  }
}

export async function callGroq(mode, data) {
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
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 오류: ${response.status}`);
  }
  
  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
    throw new Error('AI 응답을 파싱할 수 없습니다');
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
