# 🎓 AI Language Tutor

AI 기반 영어 학습 도우미 웹앱입니다. Groq LLM API를 활용하여 4가지 핵심 기능을 제공합니다.

## ✨ 기능

- **✍️ 영작 교정** — 영어 문장의 문법 오류를 교정하고, 자연스러운 원어민 표현으로 개선해 줍니다
- **🌐 번역** — 한국어↔영어 자연스러운 번역과 뉘앙스 설명을 제공합니다
- **📖 사전** — 영어 단어의 뜻, 발음(IPA), 음성, 예문을 확인할 수 있습니다
- **🎙️ 발음 피드백** — 음성 인식(STT)으로 발음을 분석하고 개선 팁을 제공합니다

## 🛠️ 기술 스택

- HTML5 / CSS3 (다크 글래스모피즘 디자인)
- Vanilla JavaScript (ES6+ Modules)
- [Groq API](https://console.groq.com) (Llama 3.3 70B)
- [Free Dictionary API](https://dictionaryapi.dev/)
- Web Speech API (브라우저 내장 STT)

## 🚀 사용법

1. 이 레포지토리를 클론합니다
2. `index.html`을 브라우저에서 엽니다 (또는 로컬 서버 사용)
3. 각 탭에서 원하는 기능을 사용합니다

> **참고**: 발음 피드백은 Chrome 또는 Edge 브라우저에서 사용 가능합니다.

## 📁 프로젝트 구조

```
ai-language-tutor/
├── index.html          # 메인 HTML
├── css/
│   └── style.css       # 다크 글래스모피즘 스타일
├── js/
│   ├── app.js          # 메인 앱 로직
│   ├── api.js          # API 호출 모듈
│   ├── speech.js       # Web Speech API 모듈
│   └── prompts.js      # LLM 프롬프트 템플릿
└── README.md
```

## 📜 라이선스

MIT License
