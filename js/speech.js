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
