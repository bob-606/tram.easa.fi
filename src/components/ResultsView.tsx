import { useState } from 'react';
import { 
  ArrowLeft, RotateCcw, Home, ChevronRight, ChevronLeft, 
  CheckCircle2, XCircle, HelpCircle, Hash,
  Award, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Question, Subject } from '@/types';

interface ResultsViewProps {
  subject: Subject;
  questions: Question[];
  answers: Record<string, number>;
  timeSeconds: number;
  onRestart: () => void;
  onHome: () => void;
}

export function ResultsView({ subject, questions, answers, timeSeconds, onRestart, onHome }: ResultsViewProps) {
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  let correctCount = 0;
  questions.forEach(q => {
    if (answers[q.id] !== undefined && answers[q.id] === q.answer) {
      correctCount++;
    }
  });

  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const getOptionLabel = (index: number) => ['A', 'B', 'C', 'D'][index];

  const answeredQuestions = questions.filter(q => answers[q.id] !== undefined);
  const unansweredQuestionsList = questions.filter(q => answers[q.id] === undefined);

  if (showReview) {
    const reviewQuestions = [...answeredQuestions, ...unansweredQuestionsList];
    const currentQ = reviewQuestions[reviewIndex];
    const selectedAnswer = answers[currentQ.id];
    const isCorrect = selectedAnswer === currentQ.answer;

    return (
      <div className="min-h-screen bg-background flex flex-col animate-fade-in">
        {/* Review header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setShowReview(false)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-sm font-semibold">Review Answers</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {reviewIndex + 1} / {reviewQuestions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Review content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Q{currentQ.number}
              </span>
              {selectedAnswer !== undefined ? (
                isCorrect ? (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Correct
                  </span>
                ) : (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Incorrect
                  </span>
                )
              ) : (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Unanswered
                </span>
              )}
            </div>

            <h3 className="text-lg font-medium text-foreground leading-relaxed mb-6">
              {currentQ.question}
            </h3>

            <div className="space-y-3">
              {currentQ.options.map((option, index) => {
                const letter = getOptionLabel(index);
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === currentQ.answer;
                const showCorrect = isCorrectAnswer && !isSelected;
                
                let borderColor = 'border-border/40 bg-card/40';
                let icon = null;
                
                if (isSelected && isCorrectAnswer) {
                  borderColor = 'border-emerald-500 bg-emerald-500/10';
                  icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-auto" />;
                } else if (isSelected && !isCorrectAnswer) {
                  borderColor = 'border-red-500 bg-red-500/10';
                  icon = <XCircle className="w-5 h-5 text-red-600 shrink-0 ml-auto" />;
                } else if (showCorrect) {
                  borderColor = 'border-emerald-500/50 bg-emerald-500/5';
                  icon = <CheckCircle2 className="w-5 h-5 text-emerald-600/60 shrink-0 ml-auto" />;
                }

                return (
                  <div
                    key={index}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${borderColor}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0
                        ${isSelected && isCorrectAnswer ? 'bg-emerald-500 text-white' :
                          isSelected && !isCorrectAnswer ? 'bg-red-500 text-white' :
                          showCorrect ? 'bg-emerald-500/20 text-emerald-600' :
                          'bg-secondary text-secondary-foreground'}`}>
                        {letter}
                      </div>
                      <span className={`text-sm leading-relaxed pt-1
                        ${isSelected || showCorrect ? 'text-foreground' : 'text-foreground/70'}`}>
                        {option}
                      </span>
                      {icon}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="sticky bottom-0 z-20 bg-background/80 backdrop-blur-md border-t border-border">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
              disabled={reviewIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewIndex(Math.min(reviewQuestions.length - 1, reviewIndex + 1))}
              disabled={reviewIndex === reviewQuestions.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
            ${score >= 75 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Award className={`w-8 h-8 ${score >= 75 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {score >= 75 ? 'Well Done!' : 'Keep Studying!'}
          </h1>
          <p className="text-sm text-muted-foreground">{subject.name}</p>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {score}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {correctCount} of {totalQuestions} correct
          </p>
        </div>

        {/* Score bar */}
        <div className="bg-card/60 border border-border/60 rounded-xl p-5 mb-6">
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{correctCount}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
            <XCircle className="w-5 h-5 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{answeredCount - correctCount}</div>
            <div className="text-xs text-muted-foreground">Incorrect</div>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
            <HelpCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{unansweredCount}</div>
            <div className="text-xs text-muted-foreground">Skipped</div>
          </div>
          <div className="bg-card/60 border border-border/60 rounded-xl p-4 text-center">
            <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {timeSeconds > 0 ? Math.round(answeredCount / (timeSeconds / 60)) : 0}
            </div>
            <div className="text-xs text-muted-foreground">Q/min</div>
          </div>
        </div>

        {/* Progress breakdown */}
        <div className="bg-card/60 border border-border/60 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4">Progress Breakdown</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Correct</span>
                <span className="font-medium text-emerald-600">{correctCount} / {totalQuestions}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(correctCount / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Incorrect</span>
                <span className="font-medium text-red-600">{answeredCount - correctCount} / {totalQuestions}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${((answeredCount - correctCount) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Skipped</span>
                <span className="font-medium text-amber-600">{unansweredCount} / {totalQuestions}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${(unansweredCount / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={onHome}>
            <Home className="w-4 h-4" />
            Back to Subjects
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowReview(true)}>
            <Hash className="w-4 h-4" />
            Review Answers
          </Button>
          <Button className="flex-1 gap-2" onClick={onRestart}>
            <RotateCcw className="w-4 h-4" />
            Study Again
          </Button>
        </div>
      </div>
    </div>
  );
}
