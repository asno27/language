// js/vocabulary.js - 단어장 관리 + SM-2 간격 반복 알고리즘

const STORAGE_KEY = 'ai_tutor_vocabulary';

function loadVocabulary() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveVocabulary(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

/**
 * SM-2 알고리즘으로 다음 복습 시점 계산
 * @param {number} quality - 0~5 (0=완전 모름, 5=완벽)
 * @param {number} repetitions - 연속 정답 횟수
 * @param {number} easeFactor - 난이도 계수 (기본 2.5)
 * @param {number} interval - 현재 간격 (일)
 */
function sm2(quality, repetitions, easeFactor, interval) {
  let newEF = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  let newInterval, newReps;
  
  if (quality >= 3) { // 정답
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 3;
    else newInterval = Math.round(interval * easeFactor);
    newReps = repetitions + 1;
  } else { // 오답
    newInterval = 1;
    newReps = 0;
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  
  return {
    repetitions: newReps,
    easeFactor: newEF,
    interval: newInterval,
    nextReview: nextReview.toISOString()
  };
}

export function saveWord(wordData) {
  const words = loadVocabulary();
  if (words.some(w => w.word.toLowerCase() === wordData.word.toLowerCase())) return false; // already exists
  
  words.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    word: wordData.word,
    phonetic: wordData.phonetic || '',
    meanings: wordData.meanings || [],
    audioUrl: wordData.audioUrl || '',
    savedAt: new Date().toISOString(),
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReview: new Date().toISOString()
  });
  
  saveVocabulary(words);
  return true;
}

export function deleteWord(id) {
  const words = loadVocabulary().filter(w => w.id !== id);
  saveVocabulary(words);
}

export function getAllWords() {
  return loadVocabulary().sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

export function getWordsForReview() {
  const now = new Date();
  return loadVocabulary().filter(w => new Date(w.nextReview) <= now);
}

export function getMasteredCount() {
  return loadVocabulary().filter(w => w.interval >= 21).length;
}

export function updateReview(id, quality) {
  const words = loadVocabulary();
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return null;
  
  const w = words[idx];
  const result = sm2(quality, w.repetitions, w.easeFactor, w.interval);
  Object.assign(words[idx], result);
  saveVocabulary(words);
  return words[idx];
}

export function isWordSaved(word) {
  return loadVocabulary().some(w => w.word.toLowerCase() === word.toLowerCase());
}

export function getTotalCount() {
  return loadVocabulary().length;
}
