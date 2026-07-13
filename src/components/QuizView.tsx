import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Bookmark, BookmarkCheck, Flag, 
  ChevronLeft, ChevronRight, Timer, Hash, BarChart3, X,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Question, Subject } from '@/types';

import explanations from '@/explanations.json';

export type QuizMode = 'flash' | 'study' | 'practice' | 'exam';

interface QuizViewProps {
  subject: Subject;
  questions: Question[];
  mode: QuizMode;
  timeLimitSeconds?: number;
  onFinish: (answers: Record<string, number>, timeSeconds: number) => void;
  onExit: () => void;
  isBookmarked: (questionId: string) => boolean;
  onToggleBookmark: (questionId: string) => void;
}

export function QuizView({ subject, questions, mode, timeLimitSeconds, onFinish, onExit, isBookmarked, onToggleBookmark }: QuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showOverview, setShowOverview] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const [startTime] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const finishedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const isStudyMode = mode === 'study';
  const isExamMode = mode === 'exam';
  const remainingTime = timeLimitSeconds ? Math.max(0, timeLimitSeconds - elapsedTime) : 0;

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
      if (timeLimitSeconds && elapsed >= timeLimitSeconds && !finishedRef.current) {
        finishedRef.current = true;
        onFinishRef.current(answersRef.current, elapsed);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime, timeLimitSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = useCallback((optionIndex: number) => {
    if (isStudyMode && answersRef.current[currentQuestion.id] !== undefined) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  }, [currentQuestion, isStudyMode]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, totalQuestions]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleFlag = useCallback(() => {
    if (isExamMode) return;
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  }, [currentQuestion, isExamMode]);

  const handleFinish = useCallback(() => {
    const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
    onFinish(answers, timeSeconds);
  }, [answers, startTime, onFinish]);

  const toggleExplanation = useCallback((qid: string) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }, []);

  const jumpToQuestion = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowOverview(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showOverview) return;

      if (e.key >= '1' && e.key <= '4') {
        const optIndex = parseInt(e.key) - 1;
        if (optIndex < currentQuestion.options.length) {
          handleAnswer(optIndex);
        }
      } else if (e.key >= 'a' && e.key <= 'd') {
        const optIndex = e.key.charCodeAt(0) - 97;
        if (optIndex < currentQuestion.options.length) {
          handleAnswer(optIndex);
        }
      } else if (e.key >= 'A' && e.key <= 'D') {
        const optIndex = e.key.charCodeAt(0) - 65;
        if (optIndex < currentQuestion.options.length) {
          handleAnswer(optIndex);
        }
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        if (!(isStudyMode && answersRef.current[currentQuestion.id] === undefined)) {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        handleFlag();
      } else if (e.key === 'b' || e.key === 'B') {
        onToggleBookmark(currentQuestion.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOverview, currentQuestion, handleNext, handlePrev, handleFlag, onToggleBookmark, isStudyMode, handleAnswer]);

  const getOptionLabel = (index: number) => {
    return ['A', 'B', 'C', 'D'][index];
  };

  const getQuestionStatus = (q: Question, idx: number) => {
    const isAnswered = answers[q.id] !== undefined;
    const isFlagged = isExamMode ? false : flaggedQuestions.has(q.id);
    const isCurrent = idx === currentIndex;
    
    if (isCurrent) return 'current';
    if (isAnswered && isFlagged) return 'answered-flagged';
    if (isAnswered) return 'answered';
    if (isFlagged) return 'flagged';
    return 'unanswered';
  };

  const selectedAnswer = answers[currentQuestion.id];
  const isAnswered = selectedAnswer !== undefined;
  const isCorrect = isAnswered && selectedAnswer === currentQuestion.answer;

  const timerColor = isExamMode && remainingTime < 300 ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onExit} className="shrink-0">
                <X className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-sm font-semibold text-foreground">{subject.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {isExamMode ? 'Mock Exam' : isStudyMode ? 'Study Mode' : 'Practice'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={`flex items-center gap-1.5 text-sm ${timerColor}`}>
                {isExamMode ? <Clock className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                <span className="font-mono">
                  {isExamMode ? formatTime(remainingTime) : formatTime(elapsedTime)}
                </span>
                {isExamMode && remainingTime < 60 && (
                  <span className="text-xs text-red-600 font-medium">CRITICAL</span>
                )}
              </div>

              {/* Progress */}
              <button 
                onClick={() => setShowOverview(true)}
                className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
              >
                <Hash className="w-4 h-4" />
                <span className="font-medium">{answeredCount}/{totalQuestions}</span>
              </button>

              {/* Finish button */}
              <Button 
                size="sm" 
                onClick={handleFinish}
                variant={answeredCount === totalQuestions ? "default" : "outline"}
                className="gap-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                {isExamMode ? 'Submit' : 'Finish'}
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-border/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Question header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              {!isExamMode && flaggedQuestions.has(currentQuestion.id) && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <Flag className="w-3 h-3" />
                  Flagged
                </span>
              )}
              {isStudyMode && isAnswered && (
                <span className={`flex items-center gap-1 text-xs font-medium ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              )}
            </div>
            {!isExamMode && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleBookmark(currentQuestion.id)}
                  className="h-8 w-8"
                >
                  {isBookmarked(currentQuestion.id) ? (
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFlag}
                  className={`h-8 w-8 ${flaggedQuestions.has(currentQuestion.id) ? 'text-amber-600' : ''}`}
                >
                  <Flag className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Question text */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-foreground leading-relaxed">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectAnswer = index === currentQuestion.answer;
              const letter = getOptionLabel(index);

              let borderColor = 'border-border/60 hover:border-border hover:bg-card/80';
              let badgeBg = 'bg-secondary text-secondary-foreground group-hover:bg-secondary/80';
              let icon = null;

              if (isStudyMode && isAnswered) {
                if (isSelected && isCorrectAnswer) {
                  borderColor = 'border-emerald-500 bg-emerald-500/10';
                  badgeBg = 'bg-emerald-500 text-white';
                  icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-auto" />;
                } else if (isSelected && !isCorrectAnswer) {
                  borderColor = 'border-red-500 bg-red-500/10';
                  badgeBg = 'bg-red-500 text-white';
                  icon = <XCircle className="w-5 h-5 text-red-600 shrink-0 ml-auto" />;
                } else if (isCorrectAnswer) {
                  borderColor = 'border-emerald-500/50 bg-emerald-500/5';
                  badgeBg = 'bg-emerald-500/20 text-emerald-600';
                  icon = <CheckCircle2 className="w-5 h-5 text-emerald-600/60 shrink-0 ml-auto" />;
                }
              } else if (isSelected) {
                borderColor = 'border-primary bg-primary/10 shadow-sm';
                badgeBg = 'bg-primary text-primary-foreground';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isStudyMode && isAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group
                    ${borderColor}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0
                      ${badgeBg}`}>
                      {letter}
                    </div>
                    <span className={`text-sm leading-relaxed pt-1 
                      ${isSelected || (isStudyMode && isAnswered && isCorrectAnswer) ? 'text-foreground' : 'text-foreground'}`}>
                      {option}
                    </span>
                    {icon}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Study mode feedback */}
          {isStudyMode && isAnswered && (() => {
            const exp = (explanations as Record<string, {brief: string; detailed: string}>)[currentQuestion.id];
            const isExpanded = expandedExplanations.has(currentQuestion.id);
            return (
              <div className={`rounded-xl border-2 p-5 mb-6 ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </p>
                    {exp && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {exp.brief}
                      </p>
                    )}
                  </div>
                </div>
                {exp?.detailed && (
                  <div className="border-t border-border/40 pt-3 mt-1">
                    <button
                      onClick={() => toggleExplanation(currentQuestion.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Show less' : 'Show detailed explanation'}
                    </button>
                    {isExpanded && (
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                        {exp.detailed}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Keyboard hints */}
          {!isStudyMode && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
              <span>Press <kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">A-D</kbd> or <kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">1-4</kbd> to select</span>
              {!isExamMode && (
                <>
                  <span><kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">F</kbd> to flag</span>
                  <span><kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">B</kbd> to bookmark</span>
                </>
              )}
              <span><kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">&#8592; &#8594;</kbd> to navigate</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className="sticky bottom-0 z-20 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {/* Quick question dots */}
            <div className="hidden sm:flex items-center gap-1">
              {questions.slice(Math.max(0, currentIndex - 5), Math.min(totalQuestions, currentIndex + 6)).map((q, i) => {
                const actualIndex = Math.max(0, currentIndex - 5) + i;
                const status = getQuestionStatus(q, actualIndex);
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(actualIndex)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 hover:scale-150
                      ${status === 'current' ? 'bg-primary w-6' : 
                        status === 'answered' ? 'bg-emerald-500' :
                        status === 'flagged' ? 'bg-amber-500' :
                        status === 'answered-flagged' ? 'bg-emerald-500 ring-2 ring-amber-500' :
                        'bg-border'}`}
                    title={`Q${actualIndex + 1}`}
                  />
                );
              })}
            </div>

            {isStudyMode ? (
              <Button
                variant={isAnswered ? "default" : "secondary"}
                size="sm"
                onClick={handleNext}
                disabled={!isAnswered}
                className="gap-1.5"
              >
                {currentIndex === totalQuestions - 1 ? (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    View Results
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant={currentIndex === totalQuestions - 1 ? "default" : "outline"}
                size="sm"
                onClick={currentIndex === totalQuestions - 1 ? handleFinish : handleNext}
                className="gap-1.5"
              >
                {currentIndex === totalQuestions - 1 ? (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Question Overview Modal */}
      {showOverview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20 animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-lg">Question Overview</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowOverview(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 overflow-auto flex-1">
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {questions.map((q, idx) => {
                  const status = getQuestionStatus(q, idx);
                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(idx)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                        ${status === 'current' ? 'bg-primary text-primary-foreground ring-2 ring-primary/50' :
                          status === 'answered' ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' :
                          status === 'flagged' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' :
                          status === 'answered-flagged' ? 'bg-emerald-500/20 text-emerald-600 border border-amber-500/50 ring-1 ring-amber-500' :
                          'bg-secondary text-muted-foreground border border-border hover:border-primary/30'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
                <span>Answered</span>
              </div>
              {!isExamMode && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
                  <span>Flagged</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-secondary border border-border" />
                <span>Unanswered</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
