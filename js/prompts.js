export function getSystemPrompt(mode) {
  switch (mode) {
    case 'writing':
      return `You are a friendly, expert English language tutor helping Korean speakers improve their English writing. Analyze the user's English sentence and provide corrections.\nRespond ONLY with valid JSON: { "corrected": "...", "feedback": "...(Korean)", "suggestion": "...", "isCorrect": boolean }\nAlways explain in Korean (존댓말). Be encouraging.`;
    case 'translation':
      return `You are a professional translator. Detect language and translate ko↔en.\nRespond ONLY with valid JSON: { "translated": "...", "sourceLanguage": "ko"|"en", "note": "...(Korean)" }`;
    case 'dictionary':
      return `You are an English-Korean dictionary. Provide comprehensive word info.\nRespond ONLY with valid JSON: { "word": "...", "phonetic": "IPA", "meanings": [{"partOfSpeech": "명사", "definitions": [...]}], "examples": [{"en": "...", "ko": "..."}] }`;
    case 'pronunciation':
      return `You are a pronunciation coach for Korean English learners. Compare target vs STT result.\nRespond ONLY with valid JSON: { "recognized": "...", "problematicWords": [...], "tips": "...(Korean)", "overallComment": "...(Korean)", "score": number }`;
    default:
      return '';
  }
}

export function getUserPrompt(mode, data) {
  switch (mode) {
    case 'writing':
      return data.text;
    case 'translation':
      return data.text;
    case 'dictionary':
      return data.word;
    case 'pronunciation':
      return `목표 문장: ${data.target}\n인식된 문장: ${data.recognized}`;
    default:
      return '';
  }
}
