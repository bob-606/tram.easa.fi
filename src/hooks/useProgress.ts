import { useState, useCallback, useEffect } from 'react';
import type { SubjectProgress, AppState } from '@/types';

const STORAGE_KEY = 'easa-ppl-study-progress';

const defaultState: AppState = {
  subjects: [],
  bookmarks: [],
  totalStudyTime: 0,
};

function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('Failed to load study progress from localStorage — resetting');
  }
  return defaultState;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useProgress() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const getSubjectProgress = useCallback((subjectId: string): SubjectProgress => {
    return state.subjects.find(s => s.subjectId === subjectId) || {
      subjectId,
      questionsAnswered: 0,
      questionsCorrect: 0,
      totalTimeSeconds: 0,
      sessionsCompleted: 0,
      lastStudied: 0,
      questionStats: {},
    };
  }, [state.subjects]);

  const recordAnswer = useCallback((subjectId: string, questionId: string, _selectedOption: number, isCorrect: boolean) => {
    setState(prev => {
      const subjects = [...prev.subjects];
      let subject = subjects.find(s => s.subjectId === subjectId);
      
      if (!subject) {
        subject = {
          subjectId,
          questionsAnswered: 0,
          questionsCorrect: 0,
          totalTimeSeconds: 0,
          sessionsCompleted: 0,
          lastStudied: Date.now(),
          questionStats: {},
        };
        subjects.push(subject);
      }

      const updatedSubject = { ...subject };
      updatedSubject.questionsAnswered += 1;
      if (isCorrect) {
        updatedSubject.questionsCorrect += 1;
      }
      updatedSubject.lastStudied = Date.now();

      const questionStats = { ...updatedSubject.questionStats };
      const existing = questionStats[questionId] || { timesAnswered: 0, timesCorrect: 0, lastAnswered: 0 };
      questionStats[questionId] = {
        timesAnswered: existing.timesAnswered + 1,
        timesCorrect: existing.timesCorrect + (isCorrect ? 1 : 0),
        lastAnswered: Date.now(),
      };
      updatedSubject.questionStats = questionStats;

      const idx = subjects.findIndex(s => s.subjectId === subjectId);
      subjects[idx] = updatedSubject;

      return { ...prev, subjects };
    });
  }, []);

  const recordSessionComplete = useCallback((subjectId: string, timeSeconds: number) => {
    setState(prev => {
      const subjects = [...prev.subjects];
      let subject = subjects.find(s => s.subjectId === subjectId);
      
      if (!subject) {
        subject = {
          subjectId,
          questionsAnswered: 0,
          questionsCorrect: 0,
          totalTimeSeconds: 0,
          sessionsCompleted: 0,
          lastStudied: Date.now(),
          questionStats: {},
        };
        subjects.push(subject);
      }

      const updatedSubject = { ...subject };
      updatedSubject.sessionsCompleted += 1;
      updatedSubject.totalTimeSeconds += timeSeconds;
      updatedSubject.lastStudied = Date.now();

      const idx = subjects.findIndex(s => s.subjectId === subjectId);
      subjects[idx] = updatedSubject;

      return {
        ...prev,
        subjects,
        totalStudyTime: prev.totalStudyTime + timeSeconds,
      };
    });
  }, []);

  const toggleBookmark = useCallback((questionId: string) => {
    setState(prev => {
      const bookmarks = prev.bookmarks.includes(questionId)
        ? prev.bookmarks.filter(b => b !== questionId)
        : [...prev.bookmarks, questionId];
      return { ...prev, bookmarks };
    });
  }, []);

  const isBookmarked = useCallback((questionId: string): boolean => {
    return state.bookmarks.includes(questionId);
  }, [state.bookmarks]);

  const getOverallStats = useCallback(() => {
    const totalAnswered = state.subjects.reduce((sum, s) => sum + s.questionsAnswered, 0);
    const totalCorrect = state.subjects.reduce((sum, s) => sum + s.questionsCorrect, 0);
    const totalSessions = state.subjects.reduce((sum, s) => sum + s.sessionsCompleted, 0);
    
    return {
      totalAnswered,
      totalCorrect,
      accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      totalSessions,
      totalStudyTime: state.totalStudyTime,
      bookmarkedCount: state.bookmarks.length,
    };
  }, [state]);

  return {
    state,
    getSubjectProgress,
    recordAnswer,
    recordSessionComplete,
    toggleBookmark,
    isBookmarked,
    getOverallStats,
  };
}
