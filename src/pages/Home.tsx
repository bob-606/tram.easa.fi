import { useState, useMemo, useCallback } from 'react';
import { 
  Plane, BookOpen, Trophy, Clock, Zap, Sparkles,
  Play, ChevronRight, X, GraduationCap, BookMarked
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { ThemeSelector } from '@/components/ThemeSelector';
import { subjects } from '@/data';
import { useProgress } from '@/hooks/useProgress';
import { SubjectCard } from '@/components/SubjectCard';
import { QuizView, type QuizMode } from '@/components/QuizView';

function shuffleOptions<T extends { options: string[]; answer: number }>(q: T): T {
  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    ...q,
    options: indices.map(i => q.options[i]),
    answer: indices.indexOf(q.answer),
  };
}
import { ResultsView } from '@/components/ResultsView';
import { FlashView } from '@/components/FlashView';
import { AIChat } from '@/components/AIChat';
import type { Question, Subject } from '@/types';

type View = 'subjects' | 'quiz' | 'results';

export default function Home() {
  const [view, setView] = useState<View>('subjects');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizTime, setQuizTime] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [modeSelectorSubject, setModeSelectorSubject] = useState<string | null>(null);
  const [dailySubject, setDailySubject] = useState<Subject | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  const progress = useProgress();
  const { themeMode, setTheme } = useTheme();

  const selectedSubject = useMemo(() => 
    dailySubject || subjects.find(s => s.id === selectedSubjectId) || null,
  [selectedSubjectId, dailySubject]);

  const overallStats = progress.getOverallStats();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const startQuiz = useCallback((subjectId: string, mode: QuizMode) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    let questions: Question[] = [];
    
    switch (mode) {
      case 'flash':
      case 'study':
      case 'practice':
      case 'exam':
        questions = [...subject.questions];
        break;
    }

    // Shuffle questions and options
    questions = questions.sort(() => Math.random() - 0.5).map(shuffleOptions);

    if (mode === 'exam') {
      // Mock exam: 20 questions or less if subject has fewer
      const examCount = Math.min(20, questions.length);
      questions = questions.slice(0, examCount);
    }

    setQuizQuestions(questions);
    setQuizAnswers({});
    setQuizTime(0);
    setQuizMode(mode);
    setSelectedSubjectId(subjectId);
    setShowModeSelector(false);
    setView('quiz');
  }, [progress]);

  const startDailyQuiz = useCallback(() => {
    const allQuestions = subjects.flatMap(s => s.questions);
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 7).map(shuffleOptions);

    const daily: Subject = {
      id: 'daily',
      name: 'Daily Q',
      number: '000',
      icon: 'Zap',
      questionCount: 7,
      examTimeMinutes: 0,
      questions: selected,
    };

    setDailySubject(daily);
    setSelectedSubjectId('daily');
    setQuizQuestions(selected);
    setQuizAnswers({});
    setQuizTime(0);
    setQuizMode('practice');
    setShowModeSelector(false);
    setView('quiz');
  }, []);

  const goHome = useCallback(() => {
    setDailySubject(null);
    setSelectedSubjectId(null);
    setView('subjects');
  }, []);

  const handleQuizFinish = useCallback((answers: Record<string, number>, timeSeconds: number) => {
    setQuizAnswers(answers);
    setQuizTime(timeSeconds);
    
    if (selectedSubjectId && selectedSubjectId !== 'daily') {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      progress.recordSessionComplete(selectedSubjectId, timeSeconds);
      Object.entries(answers).forEach(([questionId, optionIndex]) => {
        const question = subject?.questions.find(q => q.id === questionId);
        const isCorrect = question ? optionIndex === question.answer : true;
        progress.recordAnswer(selectedSubjectId, questionId, optionIndex, isCorrect);
      });
    }
    
    setView('results');
  }, [selectedSubjectId, progress]);

  const handleRestart = useCallback(() => {
    if (selectedSubjectId === 'daily') {
      startDailyQuiz();
    } else if (selectedSubjectId) {
      startQuiz(selectedSubjectId, 'practice');
    }
  }, [selectedSubjectId, startQuiz, startDailyQuiz]);

  const openModeSelector = useCallback((subjectId: string) => {
    setModeSelectorSubject(subjectId);
    setShowModeSelector(true);
  }, []);

  if (view === 'quiz' && selectedSubject && quizQuestions.length > 0) {
    if (quizMode === 'flash') {
      return (
        <FlashView
          subject={selectedSubject}
          questions={quizQuestions}
          onExit={goHome}
          onFinish={() => goHome()}
        />
      );
    }
    return (
      <QuizView
        subject={selectedSubject}
        questions={quizQuestions}
        mode={quizMode}
        timeLimitSeconds={quizMode === 'exam' ? (selectedSubject.examTimeMinutes * 60) : undefined}
        onFinish={handleQuizFinish}
        onExit={goHome}
        isBookmarked={progress.isBookmarked}
        onToggleBookmark={progress.toggleBookmark}
      />
    );
  }

  if (view === 'results' && selectedSubject) {
    return (
      <ResultsView
        subject={selectedSubject}
        questions={quizQuestions}
        answers={quizAnswers}
        timeSeconds={quizTime}
        onRestart={handleRestart}
        onHome={goHome}
      />
    );
  }

  // Subjects view (default)
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    EASA Pilot Essentials
                  </h1>
                  <p className="text-xs text-muted-foreground">for Beginners</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Master all 9 subjects with 1,009 practice questions. Track your progress and build confidence for your EASA PPL/SPL theory exams.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <ThemeSelector value={themeMode} onChange={setTheme} />
              <button
                onClick={startDailyQuiz}
                className="flex items-center gap-2 bg-card/60 border border-border/60 rounded-xl px-3 py-2 hover:bg-card/80 transition-colors cursor-pointer whitespace-nowrap"
                aria-label="Start Daily Q"
              >
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-medium text-foreground">Daily Q</span>
              </button>
              <button
                onClick={() => setShowAIChat(true)}
                className="flex items-center gap-2 bg-card/60 border border-border/60 rounded-xl px-3 py-2 hover:bg-card/80 transition-colors cursor-pointer whitespace-nowrap"
                aria-label="aiR"
              >
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-xs font-medium text-foreground">aiR</span>
              </button>
              <div className="flex items-center gap-4 sm:gap-6 bg-card/60 border border-border/60 rounded-xl px-5 py-3">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <BookOpen className="w-3 h-3" />
                    <span className="whitespace-nowrap">Questions</span>
                  </div>
                  <span className="text-lg font-bold text-foreground whitespace-nowrap">{overallStats.totalAnswered}</span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Trophy className="w-3 h-3" />
                    <span className="whitespace-nowrap">Sessions</span>
                  </div>
                  <span className="text-lg font-bold text-foreground whitespace-nowrap">{overallStats.totalSessions}</span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    <span className="whitespace-nowrap">Study Time</span>
                  </div>
                  <span className="text-lg font-bold text-foreground whitespace-nowrap">{formatTime(overallStats.totalStudyTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Study by Subject</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select a subject to start practicing
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {subjects.reduce((sum, s) => sum + s.questionCount, 0)} total questions
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              progress={progress.getSubjectProgress(subject.id)}
              onClick={() => openModeSelector(subject.id)}
            />
          ))}
        </div>
      </div>

      {/* Mode Selector Modal */}
      {showModeSelector && modeSelectorSubject && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold">
                  {subjects.find(s => s.id === modeSelectorSubject)?.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {subjects.find(s => s.id === modeSelectorSubject)?.questionCount} questions
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModeSelector(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-2">
              <button
                onClick={() => startQuiz(modeSelectorSubject, 'flash')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-emerald-500/40 
                         hover:bg-emerald-500/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">Flash Cards</div>
                  <div className="text-xs text-muted-foreground">Swipe to learn, rapid-fire memorization</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
              <button
                onClick={() => startQuiz(modeSelectorSubject, 'study')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-blue-500/40 
                         hover:bg-blue-500/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">Study In-Depth</div>
                  <div className="text-xs text-muted-foreground">Immediate feedback after each answer</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>

              <button
                onClick={() => startQuiz(modeSelectorSubject, 'practice')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-primary/40 
                         hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                  <Play className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">Practice</div>
                  <div className="text-xs text-muted-foreground">Answer freely, see results at the end</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>

              <button
                onClick={() => startQuiz(modeSelectorSubject, 'exam')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-amber-500/40 
                         hover:bg-amber-500/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20">
                  <BookMarked className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">Mock Exam</div>
                  <div className="text-xs text-muted-foreground">Timed, 20 questions, per-subject time limit</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border mt-12 py-6 text-center text-xs text-muted-foreground leading-relaxed">
        Made with<br />
        💙💙💙💙💙<br />
        🖤🖤🖤🖤🖤<br />
        🤍🤍🤍🤍🤍<br />
        in Ida-Virumaa 🇪🇺
      </div>

      <AIChat isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  );
}
