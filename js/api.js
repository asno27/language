import { getSystemPrompt, getUserPrompt } from './prompts.js';

// API 키는 localStorage에 저장됩니다. (소스코드에 직접 입력하면 보안 위험으로 GitHub에서 차단됩니다)
export function getGeminiApiKey() {
  let key = localStorage.getItem('gemini_api_key');
  if (!key) {
    key = prompt('Google Gemini API 키를 입력해주세요.\n(https://aistudio.google.com/apikey 에서 발급)');
    if (key) localStorage.setItem('gemini_api_key', key);
  }
  return key;
}

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const YOUTUBE_API_URL = 'http://localhost:8080/api/youtube';

// Gemini fallback models in case of 503 High Demand
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

export async function callGemini(mode, data, retries = 3, modelIndex = 0) {
  const systemPrompt = getSystemPrompt(mode);
  const userMessage = getUserPrompt(mode, data);
  const apiKey = getGeminiApiKey();
  
  if (modelIndex >= GEMINI_MODELS.length) {
    throw new Error('All Gemini models are currently experiencing high demand or are unavailable. Please try again later.');
  }
  const currentModel = GEMINI_MODELS[modelIndex];
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json"
    }
  };
  
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    if (response.status === 429 && retries > 0) {
      console.warn(`Rate limit exceeded. Retrying in 3 seconds... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
      return callGemini(mode, data, retries - 1, modelIndex);
    }
    if (response.status === 503) {
      console.warn(`Model ${currentModel} is overloaded (503). Trying next model...`);
      return callGemini(mode, data, retries, modelIndex + 1);
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }
  
  const resultData = await response.json();
  const textContent = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  try {
    let cleanText = textContent.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
    if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
    
    return JSON.parse(cleanText.trim());
  } catch (e) {
    console.error("Failed to parse Gemini response:", textContent);
    throw new Error("Invalid response format from AI.");
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
