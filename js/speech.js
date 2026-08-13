export class SpeechManager {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    this.isListening = false;
    this.recognition = null;
    this.onResult = null;
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;
    
    if (this.isSupported) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.recognition.continuous = false;
      
      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        this.onResult?.(text);
      };
      
      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStart?.();
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
        this.onEnd?.();
      };
      
      this.recognition.onerror = (event) => {
        this.isListening = false;
        this.onError?.(event.error);
      };
    }
  }
  
  start() {
    if (!this.isSupported) { this.onError?.('not-supported'); return; }
    if (this.isListening) { this.stop(); return; }
    try { this.recognition.start(); } catch (e) { this.onError?.(e.message); }
  }
  
  stop() {
    if (this.recognition && this.isListening) this.recognition.stop();
  }
}

/**
 * TTS(텍스트 음성 변환) - 브라우저 내장 SpeechSynthesis API 사용
 * @param {string} text - 읽을 텍스트
 * @param {string} lang - 언어 코드 ('en-US' 또는 'ko-KR')
 */
export function speak(text, lang = 'en-US') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85; // 학습용으로 약간 느리게
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
