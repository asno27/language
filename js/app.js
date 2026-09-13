import { callGemini, lookupDictionary, fetchYoutubeTranscript, getGeminiApiKey } from './api.js';
import { SpeechManager, speak } from './speech.js';
import { saveWord, deleteWord, getAllWords, getWordsForReview, getMasteredCount, updateReview, isWordSaved, getTotalCount } from './vocabulary.js';

// TTS 함수를 전역으로 노출 (innerHTML onclick에서 사용)
window.speakText = speak;

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

// Vocabulary DOM
const vocabTotal = $('#vocab-total');
const vocabReviewCount = $('#vocab-review-count');
const vocabMastered = $('#vocab-mastered');
const startReviewBtn = $('#start-review');
const vocabList = $('#vocab-list');
const flashcardOverlay = $('#flashcard-overlay');
const flashcard = $('#flashcard');
const flashcardWord = $('#flashcard-word');
const flashcardPhonetic = $('#flashcard-phonetic');
const flashcardMeaning = $('#flashcard-meaning');
const flashcardAudio = $('#flashcard-audio');
const flashcardCurrent = $('#flashcard-current');
const flashcardTotal = $('#flashcard-total');
const flashcardClose = $('#flashcard-close');

// Daily DOM
const dailySentence = $('#daily-sentence');
const dailyPractice = $('#daily-practice');
const dailyListenSlow = $('#daily-listen-slow');
const dailyListenNormal = $('#daily-listen-normal');
const dailyListenFast = $('#daily-listen-fast');
const dailyMicBtn = $('#daily-mic-btn');
const dailyMicStatus = $('#daily-mic-status');
const dailySttResult = $('#daily-stt-result');
const dailySttText = $('#daily-stt-text');
const dailyOutput = $('#daily-output');
const dailyNewBtn = $('#daily-new-btn');
const dailySpeech = new SpeechManager();

// Youtube DOM
const youtubeInput = $('#youtube-input');
const youtubeSubmit = $('#youtube-submit');
const youtubeOutput = $('#youtube-output');

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
    html = `<div class="result-section fade-in"><div class="result-label correction">✨ 완벽한 문장!</div><div class="result-text highlight">${escapeHtml(data.corrected)}</div>
    <button class="audio-btn" onclick="speakText('${escapeHtml(data.corrected).replace(/'/g, "\\'")}')">🔊 들어보기</button></div>
    <div class="result-section fade-in"><div class="result-label feedback">💡 피드백</div><div class="result-text">${escapeHtml(data.feedback)}</div></div>`;
  } else {
    html = `<div class="result-section fade-in"><div class="result-label correction">🔄 교정된 문장</div><div class="result-text highlight">${escapeHtml(data.corrected)}</div>
    <button class="audio-btn" onclick="speakText('${escapeHtml(data.corrected).replace(/'/g, "\\'")}')">🔊 들어보기</button></div>
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
  try { renderWritingResult(await callGemini('writing', { text })); }
  catch (e) { showError(writingOutput, e.message); }
  finally { hideLoading(); writingSubmit.disabled = false; }
}
writingSubmit.addEventListener('click', handleWritingSubmit);
writingInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleWritingSubmit(); });

// === TRANSLATION ===
function renderTranslationResult(data) {
  const isEnglishResult = data.sourceLanguage === 'ko';
  let html = `<div class="result-section fade-in"><div class="result-label translation">🌐 번역 결과 (${data.sourceLanguage === 'ko' ? '한→영' : '영→한'})</div><div class="result-text highlight">${escapeHtml(data.translated)}</div>
  ${isEnglishResult ? `<button class="audio-btn" onclick="speakText('${escapeHtml(data.translated).replace(/'/g, "\\'")}')">🔊 영어 발음 듣기</button>` : ''}</div>`;
  if (data.note) html += `<div class="result-section fade-in"><div class="result-label note">📝 참고 사항</div><div class="result-text">${escapeHtml(data.note)}</div></div>`;
  translationOutput.innerHTML = html;
}

async function handleTranslationSubmit() {
  const text = translationInput.value.trim();
  if (!text) return;
  showLoading(); translationSubmit.disabled = true;
  try { renderTranslationResult(await callGemini('translation', { text })); }
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
  // 발음 듣기: Free Dictionary API 음성 있으면 사용, 없으면 TTS
  if (dictData?.audioUrl) {
    html += `<button class="audio-btn" onclick="new Audio('${dictData.audioUrl}').play()">🔊 원어민 발음</button> `;
  }
  html += `<button class="audio-btn" onclick="speakText('${escapeHtml(word).replace(/'/g, "\\'")}')">${dictData?.audioUrl ? '🗣️ TTS 발음' : '🔊 발음 듣기'}</button>`;
  
  // Add save-to-vocabulary button
  const saved = isWordSaved(word);
  html += ` <button class="vocab-save-btn ${saved ? 'saved' : ''}" id="dict-save-btn" ${saved ? 'disabled' : ''} data-word="${escapeHtml(word)}" data-phonetic="${escapeHtml(phonetic)}">${saved ? '✅ 저장됨' : '⭐ 단어장에 저장'}</button>`;
  html += `</div>`;
  if (llmData?.meanings?.length) {
    html += `<div class="result-section fade-in"><div class="result-label pos">🏷️ 품사 및 뜻</div>`;
    llmData.meanings.forEach(m => { html += `<div class="result-text"><strong>${escapeHtml(m.partOfSpeech)}</strong>: ${m.definitions.map(d => escapeHtml(d)).join(', ')}</div>`; });
    html += `</div>`;
  }
  if (llmData?.examples?.length) {
    html += `<div class="result-section fade-in"><div class="result-label example">💬 예문</div>`;
    llmData.examples.forEach(ex => { html += `<div class="result-text" style="margin-bottom:8px">• ${escapeHtml(ex.en)} <button class="audio-btn" style="padding:4px 10px;font-size:0.75rem" onclick="speakText('${escapeHtml(ex.en).replace(/'/g, "\\'")}')"">🔊</button><br><span style="color:var(--text-muted);font-size:0.9rem">→ ${escapeHtml(ex.ko)}</span></div>`; });
    html += `</div>`;
  }
  dictionaryOutput.innerHTML = html;

  const saveBtn = document.getElementById('dict-save-btn');
  if (saveBtn && !saveBtn.disabled) {
    saveBtn.addEventListener('click', () => {
      const wordData = {
        word: word,
        phonetic: phonetic,
        meanings: llmData?.meanings || [],
        audioUrl: dictData?.audioUrl || ''
      };
      if (saveWord(wordData)) {
        saveBtn.textContent = '✅ 저장됨';
        saveBtn.classList.add('saved');
        saveBtn.disabled = true;
        updateVocabStats();
      }
    });
  }
}

async function handleDictionarySubmit() {
  const word = dictionaryInput.value.trim();
  if (!word) return;
  showLoading(); dictionarySubmit.disabled = true;
  try {
    const [dictData, llmData] = await Promise.all([lookupDictionary(word), callGemini('dictionary', { word })]);
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

// === VOCABULARY ===
function updateVocabStats() {
  vocabTotal.textContent = getTotalCount();
  vocabReviewCount.textContent = getWordsForReview().length;
  vocabMastered.textContent = getMasteredCount();
}

function renderVocabList() {
  const words = getAllWords();
  updateVocabStats();
  
  if (words.length === 0) {
    vocabList.innerHTML = `<div class="placeholder-message"><span class="placeholder-icon">📝</span><p>사전에서 단어를 검색하고 ⭐ 버튼으로 저장하세요</p></div>`;
    return;
  }
  
  let html = '';
  words.forEach(w => {
    const badge = w.interval >= 21 ? 'mastered' : w.repetitions > 0 ? 'learning' : 'new';
    const badgeText = w.interval >= 21 ? '마스터' : w.repetitions > 0 ? '학습중' : '새 단어';
    const meaningText = w.meanings?.[0]?.definitions?.[0] || '';
    html += `<div class="vocab-item">
      <div class="vocab-item-info">
        <span class="vocab-item-word">${escapeHtml(w.word)}</span>
        <span class="vocab-item-badge ${badge}">${badgeText}</span>
        <div class="vocab-item-meaning">${escapeHtml(meaningText)}</div>
      </div>
      <div class="vocab-item-actions">
        <button class="audio-btn" style="padding:4px 10px;font-size:0.75rem" onclick="speakText('${escapeHtml(w.word).replace(/'/g, "\\\'")}')">🔊</button>
        <button class="vocab-delete-btn" data-id="${w.id}" title="삭제">🗑️</button>
      </div>
    </div>`;
  });
  vocabList.innerHTML = html;
  
  // Delete button handlers
  vocabList.querySelectorAll('.vocab-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteWord(btn.dataset.id);
      renderVocabList();
    });
  });
}

// Flashcard Review
let reviewWords = [];
let currentCardIndex = 0;

function startFlashcardReview() {
  reviewWords = getWordsForReview();
  if (reviewWords.length === 0) {
    alert('복습할 단어가 없습니다! 🎉');
    return;
  }
  currentCardIndex = 0;
  flashcardOverlay.style.display = 'flex';
  showCard();
}

function showCard() {
  if (currentCardIndex >= reviewWords.length) {
    flashcardOverlay.style.display = 'none';
    renderVocabList();
    alert(`복습 완료! 총 ${reviewWords.length}개 단어를 복습했습니다. 🎉`);
    return;
  }
  const w = reviewWords[currentCardIndex];
  flashcardCurrent.textContent = currentCardIndex + 1;
  flashcardTotal.textContent = reviewWords.length;
  flashcardWord.textContent = w.word;
  flashcardPhonetic.textContent = w.phonetic || '';
  const meaningText = w.meanings?.map(m => `${m.partOfSpeech}: ${m.definitions?.join(', ')}`).join('\\n') || '뜻 정보 없음';
  flashcardMeaning.textContent = meaningText;
  flashcard.classList.remove('flipped');
}

flashcard.addEventListener('click', (e) => {
  if (e.target.closest('.rating-btn') || e.target.closest('.audio-btn')) return;
  flashcard.classList.toggle('flipped');
});

flashcardAudio.addEventListener('click', (e) => {
  e.stopPropagation();
  const w = reviewWords[currentCardIndex];
  if (w?.audioUrl) new Audio(w.audioUrl).play();
  else speak(w.word);
});

document.querySelectorAll('.rating-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const quality = parseInt(btn.dataset.quality);
    const w = reviewWords[currentCardIndex];
    updateReview(w.id, quality);
    currentCardIndex++;
    showCard();
  });
});

flashcardClose.addEventListener('click', () => {
  flashcardOverlay.style.display = 'none';
  renderVocabList();
});

startReviewBtn.addEventListener('click', startFlashcardReview);

// Update vocab when switching to vocabulary tab
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'vocabulary') renderVocabList();
    if (btn.dataset.tab === 'daily') loadDailySentence();
  });
});

// === DAILY SENTENCE ===
let currentDailySentence = null;

async function loadDailySentence() {
  // Check if we already have today's sentence
  const stored = localStorage.getItem('daily_sentence');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      const storedDate = new Date(data.date).toDateString();
      const today = new Date().toDateString();
      if (storedDate === today) {
        displayDailySentence(data);
        return;
      }
    } catch {}
  }
  await generateDailySentence();
}

async function generateDailySentence() {
  dailySentence.innerHTML = `<div class="placeholder-message"><span class="placeholder-icon">⏳</span><p>오늘의 추천 영어 표현들을 생성 중입니다...</p></div>`;
  dailyPractice.style.display = 'none';
  try {
    const result = await callGemini('daily', {});
    const data = { ...result, date: new Date().toISOString() };
    localStorage.setItem('daily_sentence', JSON.stringify(data));
    displayDailySentence(data);
  } catch (e) {
    dailySentence.innerHTML = `<div class="placeholder-message"><span class="placeholder-icon">⚠️</span><p>생성에 실패했습니다: ${escapeHtml(e.message)}</p></div>`;
  }
}

function displayDailySentence(data) {
  currentDailySentence = data;
  let html = '';
  
  if (data.themes && Array.isArray(data.themes)) {
    data.themes.forEach((theme, index) => {
      let wordsHtml = '';
      if (theme.words && theme.words.length > 0) {
        wordsHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">';
        wordsHtml += '<strong style="color:var(--accent-1); font-size:0.85rem;">📚 오늘의 단어:</strong>';
        theme.words.forEach(w => {
          wordsHtml += `<div style="font-size:0.9rem; margin-top:4px;"><span style="color:#e0e0e0;">${escapeHtml(w.word)}</span> - <span style="color:var(--text-muted);">${escapeHtml(w.meaning)}</span></div>`;
        });
        wordsHtml += '</div>';
      }
      
      html += `
        <div class="daily-theme-card fade-in" style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 10px;">
            <span style="background: linear-gradient(135deg, var(--accent-1), var(--accent-2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; font-size: 0.9rem;">
              🏷️ ${escapeHtml(theme.name)}
            </span>
            <button class="audio-btn" style="padding: 4px 10px; font-size: 0.8rem;" onclick="speakText('${escapeHtml(theme.sentence).replace(/'/g, "\\'")}')">🔊 듣기</button>
          </div>
          <div class="daily-sentence-text" style="font-size: 1.1rem; margin-bottom: 5px; color: #fff;">${escapeHtml(theme.sentence)}</div>
          <div class="daily-sentence-translation" style="color: var(--text-muted); font-size: 0.95rem;">🇰🇷 ${escapeHtml(theme.translation)}</div>
          ${wordsHtml}
          <div style="margin-top: 10px; text-align: right;">
            <button class="audio-btn" style="background: rgba(255,255,255,0.1); padding: 5px 12px; font-size: 0.8rem;" onclick="setShadowingTarget('${escapeHtml(theme.sentence).replace(/'/g, "\\'")}')">🎙️ 이 문장으로 쉐도잉 연습</button>
          </div>
        </div>
      `;
    });
  } else {
    // Fallback for old saved data structure
    html = `
      <div class="daily-sentence-text">${escapeHtml(data.sentence || '')}</div>
      <div class="daily-sentence-translation">🇰🇷 ${escapeHtml(data.translation || '')}</div>
      ${data.context ? `<div class="daily-sentence-context" style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted);">💡 ${escapeHtml(data.context)}</div>` : ''}
    `;
  }
  
  dailySentence.innerHTML = html;
  dailyPractice.style.display = 'block';
  
  // Initialize shadowing with the first theme if available
  if (data.themes && data.themes.length > 0) {
    setShadowingTarget(data.themes[0].sentence);
  } else if (data.sentence) {
    setShadowingTarget(data.sentence);
  }
}

// Global function so onclick works
window.setShadowingTarget = function(sentence) {
  currentDailySentence = { sentence: sentence };
  document.getElementById('daily-stt-result').style.display = 'none';
  document.getElementById('daily-stt-text').textContent = '';
  document.getElementById('daily-mic-status').textContent = '문장을 읽고 발음 평가를 받아보세요.';
};

// Daily TTS buttons
dailyListenSlow.addEventListener('click', () => {
  if (!currentDailySentence) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(currentDailySentence.sentence);
  u.lang = 'en-US'; u.rate = 0.6;
  window.speechSynthesis.speak(u);
});

dailyListenNormal.addEventListener('click', () => {
  if (!currentDailySentence) return;
  speak(currentDailySentence.sentence);
});

dailyListenFast.addEventListener('click', () => {
  if (!currentDailySentence) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(currentDailySentence.sentence);
  u.lang = 'en-US'; u.rate = 1.2;
  window.speechSynthesis.speak(u);
});

// Daily STT setup
dailySpeech.onStart = () => { 
  dailyMicBtn.classList.add('recording'); 
  dailyMicStatus.textContent = '녹음 중... (완료 시 버튼을 다시 누르세요)'; 
  dailyMicStatus.style.color = 'var(--error)'; 
  dailySttResult.style.display = 'block';
  dailySttText.textContent = '듣고 있습니다...';
};
dailySpeech.onEnd = () => { 
  dailyMicBtn.classList.remove('recording'); 
  dailyMicStatus.textContent = '녹음이 완료되었습니다.'; 
  dailyMicStatus.style.color = ''; 
};
dailySpeech.onError = (error) => {
  dailyMicBtn.classList.remove('recording');
  let msg = '음성 인식 중 오류가 발생했습니다.';
  if (error === 'no-speech') msg = '목소리가 감지되지 않았습니다.';
  else if (error === 'not-allowed') msg = '마이크 권한이 거부되었습니다.';
  dailyMicStatus.textContent = msg; dailyMicStatus.style.color = 'var(--error)';
};
dailySpeech.onInterim = (text) => {
  dailySttResult.style.display = 'block';
  dailySttText.textContent = text;
};
dailySpeech.onResult = async (text) => {
  dailySttResult.style.display = 'block';
  dailySttText.textContent = text;
  if (!currentDailySentence) return;
  showLoading();
  try {
    const result = await callGemini('pronunciation', { target: currentDailySentence.sentence, recognized: text });
    let html = '';
    // Score badge
    const scoreClass = result.score >= 80 ? 'good' : result.score >= 50 ? 'ok' : 'needs-work';
    html += `<div class="result-section fade-in" style="text-align:center"><div class="daily-score ${scoreClass}">🎯 ${result.score}점</div></div>`;
    html += `<div class="result-section fade-in"><div class="result-label recognized">🎙️ 인식된 문장</div><div class="result-text highlight">${escapeHtml(result.recognized)}</div></div>`;
    if (result.problematicWords?.length) {
      html += `<div class="result-section fade-in"><div class="result-label warning">⚠️ 주의할 발음</div><div class="result-text">${result.problematicWords.map(w => `<span style="background:rgba(255,107,107,0.15);color:var(--error);padding:2px 8px;border-radius:4px;margin-right:6px">${escapeHtml(w)}</span>`).join(' ')}</div></div>`;
    }
    if (result.tips) html += `<div class="result-section fade-in"><div class="result-label tip">🗣️ 발음 팁</div><div class="result-text">${escapeHtml(result.tips)}</div></div>`;
    if (result.overallComment) html += `<div class="result-section fade-in"><div class="result-label overall">👏 총평</div><div class="result-text">${escapeHtml(result.overallComment)}</div></div>`;
    dailyOutput.innerHTML = html;
  } catch (e) { showError(dailyOutput, e.message); }
  finally { hideLoading(); }
};

dailyMicBtn.addEventListener('click', () => {
  if (!currentDailySentence) {
    dailyMicStatus.textContent = '⚠️ 먼저 오늘의 문장을 불러와 주세요!';
    dailyMicStatus.style.color = 'var(--warning-1)';
    return;
  }
  dailySpeech.start();
});

dailyNewBtn.addEventListener('click', generateDailySentence);

// 다운로드 헬퍼 함수
function downloadTextFile(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// === YOUTUBE TRANSLATION ===

async function handleYoutubeSubmit() {
  const url = youtubeInput.value.trim();
  if (!url) return;
  showLoading();
  youtubeSubmit.disabled = true;
  youtubeOutput.innerHTML = `<div class="placeholder-message"><span class="placeholder-icon">⏳</span><p>서버에서 영상 스크립트를 추출 중입니다 (최대 1~2분 소요)...</p></div>`;
  
  try {
    const apiKey = getGeminiApiKey();
    // 1. 서버에서 스크립트 덩어리(segments) 가져오기
    const ytData = await fetchYoutubeTranscript(url, apiKey);
    const segments = ytData.segments;
    const sourceMsg = ytData.source === 'cc' ? '공식 자막 추출' : '오디오 음성 인식 추출';
    
    // 2. 스크립트 번역 (각 덩어리마다 번역하여 점진적 렌더링)
    youtubeOutput.innerHTML = `
      <div class="result-section fade-in" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; background: transparent; padding: 0; border: none;">
        <div class="result-label note" style="margin-bottom: 0;">ℹ️ 스크립트 출처: ${sourceMsg}</div>
        <div>
          <button class="submit-btn" id="download-txt" style="padding: 8px 16px; font-size: 0.9rem;" disabled>📥 번역 중...</button>
        </div>
      </div>
      <div id="segments-container"></div>
      <div id="translating-indicator" class="placeholder-message" style="margin-top: 1rem;">
        <span class="placeholder-icon">🔄</span><p>AI가 순차적으로 번역 중입니다...</p>
      </div>
    `;
    
    const container = document.getElementById('segments-container');
    let textContentToDownload = "=== 유튜브 영상 번역 ===\nURL: " + url + "\n\n";
    
    for (const seg of segments) {
      const translationData = await callGemini('translation', { text: seg.text });
      const translated = translationData.translated;
      
      const segmentHtml = `
        <div class="transcript-segment fade-in" style="margin-bottom: 1.5rem; padding: 1.2rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
          <div class="timecode" style="color: var(--accent-1); font-weight: 600; font-size: 0.9rem; margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
            <span>⏱️ [${seg.time}]</span>
            <button class="audio-btn" style="padding: 4px 8px; font-size: 0.75rem;" onclick="speakText('${escapeHtml(seg.text).replace(/'/g, "\\'")}')">🔊 듣기</button>
          </div>
          <div class="eng-text" style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 0.8rem; line-height: 1.5;">${escapeHtml(seg.text)}</div>
          <div class="kor-text" style="font-size: 1.05rem; color: #fff; line-height: 1.6;">${escapeHtml(translated)}</div>
        </div>
      `;
      
      container.insertAdjacentHTML('beforeend', segmentHtml);
      textContentToDownload += `[${seg.time}]\n원문: ${seg.text}\n번역: ${translated}\n\n`;
      
      // Groq 무료 계정의 분당 토큰 제한(TPM) 초과를 방지하기 위해 청크 사이에 2초 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    document.getElementById('translating-indicator').style.display = 'none';
    
    const downloadBtn = document.getElementById('download-txt');
    downloadBtn.disabled = false;
    downloadBtn.textContent = '📥 텍스트 파일로 다운로드';
    downloadBtn.addEventListener('click', () => {
      downloadTextFile('youtube_translation.txt', textContentToDownload);
    });
    
  } catch (e) {
    showError(youtubeOutput, e.message);
  } finally {
    hideLoading();
    youtubeSubmit.disabled = false;
  }
}

youtubeSubmit.addEventListener('click', handleYoutubeSubmit);
youtubeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleYoutubeSubmit(); });

// Initialize vocab stats on load
updateVocabStats();

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
  try { renderPronunciationResult(await callGemini('pronunciation', { target, recognized: text })); }
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
