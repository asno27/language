import { callGroq, lookupDictionary } from './api.js';
import { SpeechManager } from './speech.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// DOM elements
const tabBtns = $$('.tab-btn');
const tabPanes = $$('.tab-pane');
const writingInput = $('#writing-input');
const writingSubmit = $('#writing-submit');
const writingOutput = $('#writing-output');
const writingCharCount = $('#writing-char-count');
const translationInput = $('#translation-input');
const translationSubmit = $('#translation-submit');
const translationOutput = $('#translation-output');
const translationCharCount = $('#translation-char-count');
const dictionaryInput = $('#dictionary-input');
const dictionarySubmit = $('#dictionary-submit');
const dictionaryOutput = $('#dictionary-output');
const pronunciationTarget = $('#pronunciation-target');
const micBtn = $('#mic-btn');
const micStatus = $('#mic-status');
const sttResult = $('#stt-result');
const sttText = $('#stt-text');
const pronunciationOutput = $('#pronunciation-output');
const loading = $('#loading');
const speech = new SpeechManager();

// Tab Navigation
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tabPanes.forEach(p => p.classList.remove('active'));
    $(`#pane-${btn.dataset.tab}`).classList.add('active');
  });
});

// Character counters
writingInput.addEventListener('input', () => writingCharCount.textContent = `${writingInput.value.length}자`);
translationInput.addEventListener('input', () => translationCharCount.textContent = `${translationInput.value.length}자`);

// Helpers
function showLoading() { loading.style.display = 'flex'; }
function hideLoading() { loading.style.display = 'none'; }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function showError(el, msg) {
  el.innerHTML = `<div class="result-section fade-in"><div class="result-label warning">⚠️ 오류</div><div class="result-text">${escapeHtml(msg)}</div></div>`;
}

// === WRITING ===
function renderWritingResult(data) {
  let html = '';
  if (data.isCorrect) {
    html = `<div class="result-section fade-in"><div class="result-label correction">✨ 완벽한 문장!</div><div class="result-text highlight">${escapeHtml(data.corrected)}</div></div>
    <div class="result-section fade-in"><div class="result-label feedback">💡 피드백</div><div class="result-text">${escapeHtml(data.feedback)}</div></div>`;
  } else {
    html = `<div class="result-section fade-in"><div class="result-label correction">🔄 교정된 문장</div><div class="result-text highlight">${escapeHtml(data.corrected)}</div></div>
    <div class="result-section fade-in"><div class="result-label feedback">💡 피드백</div><div class="result-text">${escapeHtml(data.feedback)}</div></div>`;
    if (data.suggestion) {
      html += `<div class="result-section fade-in"><div class="result-label suggestion">🌟 더 자연스러운 표현</div><div class="result-text">${escapeHtml(data.suggestion)}</div></div>`;
    }
  }
  writingOutput.innerHTML = html;
}

async function handleWritingSubmit() {
  const text = writingInput.value.trim();
  if (!text) return;
  showLoading(); writingSubmit.disabled = true;
  try { renderWritingResult(await callGroq('writing', { text })); }
  catch (e) { showError(writingOutput, e.message); }
  finally { hideLoading(); writingSubmit.disabled = false; }
}
writingSubmit.addEventListener('click', handleWritingSubmit);
writingInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleWritingSubmit(); });

// === TRANSLATION ===
function renderTranslationResult(data) {
  let html = `<div class="result-section fade-in"><div class="result-label translation">🌐 번역 결과 (${data.sourceLanguage === 'ko' ? '한→영' : '영→한'})</div><div class="result-text highlight">${escapeHtml(data.translated)}</div></div>`;
  if (data.note) html += `<div class="result-section fade-in"><div class="result-label note">📝 참고 사항</div><div class="result-text">${escapeHtml(data.note)}</div></div>`;
  translationOutput.innerHTML = html;
}

async function handleTranslationSubmit() {
  const text = translationInput.value.trim();
  if (!text) return;
  showLoading(); translationSubmit.disabled = true;
  try { renderTranslationResult(await callGroq('translation', { text })); }
  catch (e) { showError(translationOutput, e.message); }
  finally { hideLoading(); translationSubmit.disabled = false; }
}
translationSubmit.addEventListener('click', handleTranslationSubmit);
translationInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleTranslationSubmit(); });

// === DICTIONARY ===
function renderDictionaryResult(dictData, llmData) {
  const word = llmData?.word || dictData?.word || '';
  const phonetic = dictData?.phonetic || llmData?.phonetic || '';
  let html = `<div class="result-section fade-in"><div class="result-label word-title">📖 ${escapeHtml(word)} ${phonetic ? `<span style="font-weight:400;color:var(--text-muted);font-size:0.9rem">${escapeHtml(phonetic)}</span>` : ''}</div>`;
  if (dictData?.audioUrl) html += `<button class="audio-btn" onclick="new Audio('${dictData.audioUrl}').play()">🔊 발음 듣기</button>`;
  html += `</div>`;
  if (llmData?.meanings?.length) {
    html += `<div class="result-section fade-in"><div class="result-label pos">🏷️ 품사 및 뜻</div>`;
    llmData.meanings.forEach(m => { html += `<div class="result-text"><strong>${escapeHtml(m.partOfSpeech)}</strong>: ${m.definitions.map(d => escapeHtml(d)).join(', ')}</div>`; });
    html += `</div>`;
  }
  if (llmData?.examples?.length) {
    html += `<div class="result-section fade-in"><div class="result-label example">💬 예문</div>`;
    llmData.examples.forEach(ex => { html += `<div class="result-text" style="margin-bottom:8px">• ${escapeHtml(ex.en)}<br><span style="color:var(--text-muted);font-size:0.9rem">→ ${escapeHtml(ex.ko)}</span></div>`; });
    html += `</div>`;
  }
  dictionaryOutput.innerHTML = html;
}

async function handleDictionarySubmit() {
  const word = dictionaryInput.value.trim();
  if (!word) return;
  showLoading(); dictionarySubmit.disabled = true;
  try {
    const [dictData, llmData] = await Promise.all([lookupDictionary(word), callGroq('dictionary', { word })]);
    renderDictionaryResult(dictData, llmData);
  } catch (e) { showError(dictionaryOutput, e.message); }
  finally { hideLoading(); dictionarySubmit.disabled = false; }
}
dictionarySubmit.addEventListener('click', handleDictionarySubmit);
dictionaryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleDictionarySubmit(); });

// === PRONUNCIATION ===
function renderPronunciationResult(data) {
  let html = `<div class="result-section fade-in"><div class="result-label recognized">🎙️ 인식된 문장</div><div class="result-text highlight">${escapeHtml(data.recognized)}</div></div>`;
  if (data.problematicWords?.length) {
    html += `<div class="result-section fade-in"><div class="result-label warning">⚠️ 주의해야 할 발음</div><div class="result-text">${data.problematicWords.map(w => `<span style="background:rgba(255,107,107,0.15);color:var(--error);padding:2px 8px;border-radius:4px;margin-right:6px">${escapeHtml(w)}</span>`).join(' ')}</div></div>`;
  }
  if (data.tips) html += `<div class="result-section fade-in"><div class="result-label tip">🗣️ 발음 팁</div><div class="result-text">${escapeHtml(data.tips)}</div></div>`;
  html += `<div class="result-section fade-in"><div class="result-label overall">👏 총평 ${data.score !== undefined ? `<span style="background:linear-gradient(135deg,var(--accent-1),var(--accent-2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:1.1rem;margin-left:8px">${data.score}점</span>` : ''}</div><div class="result-text">${escapeHtml(data.overallComment)}</div></div>`;
  pronunciationOutput.innerHTML = html;
}

// Speech setup
if (!speech.isSupported) {
  micBtn.style.opacity = '0.5'; micBtn.style.cursor = 'not-allowed';
  micStatus.textContent = '이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.';
}
speech.onStart = () => { micBtn.classList.add('recording'); micStatus.textContent = '🔴 듣고 있습니다... 말씀해 주세요'; micStatus.style.color = 'var(--error)'; };
speech.onEnd = () => { micBtn.classList.remove('recording'); micStatus.textContent = '마이크 버튼을 눌러 다시 시작하세요'; micStatus.style.color = ''; };
speech.onError = (error) => {
  micBtn.classList.remove('recording');
  let msg = '음성 인식 오류가 발생했습니다.';
  if (error === 'not-supported') msg = '이 브라우저는 음성 인식을 지원하지 않습니다.';
  else if (error === 'no-speech') msg = '음성이 감지되지 않았습니다. 다시 시도해 주세요.';
  else if (error === 'not-allowed') msg = '마이크 사용 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.';
  micStatus.textContent = msg; micStatus.style.color = 'var(--error)';
};
speech.onResult = async (text) => {
  sttResult.style.display = 'block'; sttText.textContent = text;
  const target = pronunciationTarget.value.trim();
  if (!target) { showError(pronunciationOutput, '목표 문장을 먼저 입력해 주세요.'); return; }
  showLoading();
  try { renderPronunciationResult(await callGroq('pronunciation', { target, recognized: text })); }
  catch (e) { showError(pronunciationOutput, e.message); }
  finally { hideLoading(); }
};
micBtn.addEventListener('click', () => {
  if (!pronunciationTarget.value.trim()) {
    micStatus.textContent = '⚠️ 먼저 목표 문장을 입력해 주세요!'; micStatus.style.color = 'var(--warning-1)';
    pronunciationTarget.focus(); return;
  }
  speech.start();
});

console.log('🎓 AI Language Tutor loaded successfully!');
