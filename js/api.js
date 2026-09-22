import { getSystemPrompt, getUserPrompt } from './prompts.js';

// API ?¤ëŠ” localStorage???€?¥ë©?ˆë‹¤. (?ŒìŠ¤ì½”ë“œ??ì§ì ‘ ?…ë ¥?˜ë©´ ë³´ì•ˆ ?„í—˜?¼ë¡œ GitHub?ì„œ ì°¨ë‹¨?©ë‹ˆ??
let currentKeyIndex = 0;

export function getGroqApiKey() {
  let key = localStorage.getItem('groq_api_key');
  if (!key) {
    key = prompt('Groq API Å°¸¦ ÀÔ·ÂÇØÁÖ¼¼¿ä (À¯Æ©ºê ¿Àµð¿À ÃßÃâ ¹× ¹é¾÷ ¹ø¿ª¿ë):');
    if (key) localStorage.setItem('groq_api_key', key.trim());
  }
  return key || '';
}

export function getGeminiApiKey() {
  let keysString = localStorage.getItem('gemini_api_key');
  if (!keysString) {
    keysString = prompt('Google Gemini API ?¤ë? ?…ë ¥?´ì£¼?¸ìš”.\n?¬ëŸ¬ ê°œì¼ ê²½ìš° ?¼í‘œ(,)ë¡?êµ¬ë¶„?´ì„œ ?ì–´ì£¼ì„¸??');
    if (keysString) localStorage.setItem('gemini_api_key', keysString);
  }
  if (!keysString) return null;
  
  const keys = keysString.split(',').map(k => k.trim()).filter(k => k);
  if (keys.length === 0) return null;
  
  const keyToUse = keys[currentKeyIndex % keys.length];
  currentKeyIndex++;
  return keyToUse;
}

// ?¬ìš©?ê? ì½˜ì†”?ì„œ ?½ê²Œ ?¤ë? ì¶”ê?/ë³€ê²½í•  ???ˆë„ë¡??„ì—­ ?¨ìˆ˜ ?œê³µ
window.updateGeminiKeys = function() {
  const current = localStorage.getItem('gemini_api_key') || '';
  const newKeys = prompt('Gemini API ?¤ë? ?…ë ¥?˜ì„¸??\n(?¬ëŸ¬ ê°œëŠ” ?¼í‘œë¡?êµ¬ë¶„)', current);
  if (newKeys !== null) {
    localStorage.setItem('gemini_api_key', newKeys);
    alert('API ?¤ê? ?±ê³µ?ìœ¼ë¡??…ë°?´íŠ¸?˜ì—ˆ?µë‹ˆ??\n?€?¥ëœ ?? ' + newKeys);
  }
};

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
export function getYoutubeApiUrl() {
  const savedUrl = localStorage.getItem('backend_url');
  if (savedUrl) {
    return savedUrl.replace(/\/$/, '') + '/api/youtube';
  }
  return "https://language-7h32.onrender.com/api/youtube";
}

// Gemini 3.6 Flash ëª¨ë¸ ?¬ìš© (?‘ë‹µ ?ë„?€ ?ˆì§ˆ??ë§¤ìš° ?°ìˆ˜)
const GEMINI_MODEL = 'gemini-1.5-flash';

export async function callGemini(mode, data, retries = 3) {
    const systemPrompt = getSystemPrompt(mode);
    const userMessage = getUserPrompt(mode, data);
    const apiKey = getGeminiApiKey();
    const groqKey = getGroqApiKey();
    
    // Check if local backend is configured
    const customBackend = localStorage.getItem('backend_url');
    if (customBackend) {
        const backendUrl = customBackend.replace(/\/$/, '') + '/api/llm';
        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({
                    systemPrompt: systemPrompt,
                    userMessage: userMessage,
                    gemini_key: apiKey,
                    groq_key: groqKey
                })
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    return result.data;
                }
            }
            console.warn("Backend /api/llm failed, falling back to direct frontend call...");
        } catch (e) {
            console.warn("Backend /api/llm error:", e, "Falling back to direct frontend call...");
        }
    }
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }]
        }
      ],
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    };
  
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.warn(`Rate limit exceeded. Retrying in 3 seconds... (${retries} retries left)`);
        await new Promise(r => setTimeout(r, 3000));
        return callGemini(mode, data, retries - 1);
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API ?ëŸ¬: ${response.status}`);
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
  const groqKey = getGroqApiKey();
  const response = await fetch(getYoutubeApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ url, api_key: apiKey, groq_key: groqKey })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `?œë²„ ?¤ë¥˜: ${response.status}`);
  }
  return await response.json();
}

