# 인수인계서 (Handover Document)

**작성일시**: 2026-09-17
**프로젝트**: AI Language Tutor (영어 공부 어플 제작)

## 1. 현재 진행 상황 요약
사용자는 스마트폰과 PC를 오가며 영어 학습 웹앱을 개발 중입니다.
어제와 오늘에 걸쳐 다음 핵심 기능들을 성공적으로 마무리했습니다.

- **모바일 UI 개선**: 탭 메뉴를 가로 스크롤(Horizontal Scroll) 방식으로 변경 완료 (`css/style.css`).
- **원클릭 미니 사전**: 어떤 영어 텍스트든 클릭(터치)하면 Gemini AI를 통해 한국어 뜻을 팝업으로 띄우고 즉시 단어장으로 저장하는 기능 완료 (`js/app.js`).
- **유튜브 자막 서버 클라우드 배포**: 로컬 파이썬 백엔드(FastAPI)를 Render(`https://language-7h32.onrender.com`)에 성공적으로 배포 및 연동 완료 (`js/api.js`).

## 2. 해결된 주요 이슈
- Gemini API 503 에러 발생 시, 여러 모델(gemini-1.5-flash, gemini-pro 등)을 순회하며 재시도하는 Fallback 로직을 구현하려다 원복함.
- 무료 사전 API(`dictionaryapi.dev`)가 단어의 과거/복수형 변형을 인식하지 못하고 영영사전만 제공하여, 미니 사전 기능을 Gemini AI 호출 방식으로 전면 수정함.

## 3. 내일(다음 세션) 진행할 작업
다음 세션에서는 기획안의 2순위인 **"AI 상황극 튜터 (Role-play)"** 탭 개발을 가장 먼저 시작해야 합니다.

- **목표**: 사용자가 특정 상황(스타벅스 주문 등)을 선택하고, 마이크(STT)로 AI 원어민과 대화(TTS)를 주고받으며 미션을 수행하는 탭. 대화가 끝나면 종합 교정 피드백 제공.
- **참고 기획안**: `docs/Future_Implementation_Plan.md` 2번 항목 확인.

## 4. 참고 사항
- 프로젝트 코드는 현재 로컬 디렉토리와 사용자의 `C:\Users\Kai\OneDrive\Documents\카카오톡 받은 파일\영어 공부 어플 제작` 폴더에 모두 동기화(백업)되어 있습니다.
- 코드의 메인 저장소는 GitHub(`asno27/language`)이며, 서버는 Render(`language-7h32.onrender.com`)에 배포되어 있습니다.
