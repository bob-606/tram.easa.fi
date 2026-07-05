export interface Question {
  id: string;
  number: number;
  question: string;
  options: string[];
  answer: number;
}

export interface Subject {
  id: string;
  name: string;
  number: string;
  icon: string;
  questionCount: number;
  examTimeMinutes: number;
  questions: Question[];
}

export interface QuizSession {
  subjectId: string;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, number>;
  startTime: number;
  endTime?: number;
  mode: 'practice' | 'exam';
}

export interface SubjectProgress {
  subjectId: string;
  questionsAnswered: number;
  questionsCorrect: number;
  totalTimeSeconds: number;
  sessionsCompleted: number;
  lastStudied: number;
  questionStats: Record<string, {
    timesAnswered: number;
    timesCorrect: number;
    lastAnswered: number;
  }>;
}

export interface AppState {
  subjects: SubjectProgress[];
  bookmarks: string[];
  totalStudyTime: number;
}
