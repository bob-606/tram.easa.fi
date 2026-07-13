import { useState, useCallback, useEffect, useRef } from 'react';
import {
  X, CheckCircle2, XCircle,
  Sparkles, Hash, ChevronDown, ChevronUp, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Question, Subject } from '@/types';
import explanations from '@/explanations.json';

interface FlashViewProps {
  subject: Subject;
  questions: Question[];
  onExit: () => void;
  onFinish: (results: FlashResults) => void;
}

export interface FlashResults {
  known: string[];
  unknown: string[];
  totalTime: number;
}

export function FlashView({ subject, questions, onExit, onFinish }: FlashViewProps) {
  const [queue, setQueue] = useState<string[]>(() =>
    questions.map(q => q.id).sort(() => Math.random() - 0.5)
  );
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [unknown, setUnknown] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [completed, setCompleted] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [flying, setFlying] = useState<'left' | 'right' | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const transitioning = useRef(false);
  const pointerStartX = useRef(0);
  const isPointerDown = useRef(false);

  const currentId = queue[0] || reviewQueue[0];
  const currentQuestion = questions.find(q => q.id === currentId);
  const answeredCount = known.size + unknown.size;
  const totalQuestions = questions.length;

  const advance = useCallback((knewIt: boolean) => {
    if (!currentId || transitioning.current) return;
    transitioning.current = true;

    const isLastQuestion = queue.length + reviewQueue.length === 1;

    setFlying(knewIt ? 'right' : 'left');

    setTimeout(() => {
      if (knewIt) {
        setKnown(prev => new Set(prev).add(currentId));
      } else {
        setUnknown(prev => new Set(prev).add(currentId));
        setReviewQueue(prev => {
          const next = [...prev];
          next.splice(Math.min(3, next.length), 0, currentId);
          return next;
        });
      }

      if (queue.length > 0) {
        setQueue(prev => prev.slice(1));
      }

      setRevealed(false);
      setExpanded(false);
      setFlying(null);
      setSwipeOffset(0);
      transitioning.current = false;

      if (isLastQuestion && knewIt) {
        setCompleted(true);
      }
    }, 250);
  }, [currentId, queue, reviewQueue]);

  const handleFlip = useCallback(() => {
    if (currentId && !transitioning.current) {
      setRevealed(prev => !prev);
    }
  }, [currentId]);

  // Pointer events for swipe + tap
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (transitioning.current) return;
    isPointerDown.current = true;
    pointerStartX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    const delta = e.clientX - pointerStartX.current;
    if (revealed) {
      setSwipeOffset(delta);
    }
  }, [revealed]);

  const handlePointerUp = useCallback(() => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;

    if (revealed) {
      const absDelta = Math.abs(swipeOffset);
      if (absDelta > 60) {
        advance(swipeOffset > 0);
      } else {
        setSwipeOffset(0);
        handleFlip();
      }
    } else {
      handleFlip();
    }
  }, [revealed, swipeOffset, advance, handleFlip]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || transitioning.current) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight' || e.key === '1') {
        if (revealed) advance(true);
      } else if (e.key === 'ArrowLeft' || e.key === '2') {
        if (revealed) advance(false);
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, completed, handleFlip, advance, onExit]);

  const handleFinish = useCallback(() => {
    const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
    onFinish({ known: [...known], unknown: [...unknown], totalTime: timeSeconds });
  }, [startTime, known, unknown, onFinish]);

  if (completed) {
    const total = totalQuestions;
    const correct = known.size;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${pct >= 80 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
            <Sparkles className={`w-8 h-8 ${pct >= 80 ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">Session Complete!</h2>
          <p className="text-sm text-muted-foreground mb-6">{subject.name}</p>
          <div className="text-4xl font-bold text-foreground mb-1">{pct}%</div>
          <p className="text-xs text-muted-foreground mb-8">{correct} of {total} known</p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 bg-emerald-500/10 rounded-xl px-4 py-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-600">{correct} Known</span>
            </div>
            <div className="flex items-center gap-2 bg-red-500/10 rounded-xl px-4 py-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-600">{total - correct} Review</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={onExit}>
              <Home className="w-4 h-4" />
              Subjects
            </Button>
            <Button className="flex-1 gap-2" onClick={handleFinish}>
              <Home className="w-4 h-4" />
              Save & Finish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const correctText = currentQuestion.options[currentQuestion.answer];
  const exp = (explanations as Record<string, { brief: string; detailed: string }>)[currentQuestion.id];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onExit}>
              <X className="w-5 h-5" />
            </Button>
            <span className="text-xs text-foreground/70 font-medium">
              {subject.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleFinish} className="gap-1.5">
              <Hash className="w-4 h-4" />
              <span className="text-xs">{answeredCount}/{totalQuestions}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs text-foreground/70 mb-1.5">
            <span>Flash Cards</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-600">✓ {known.size}</span>
              <span className="text-red-600">✗ {unknown.size}</span>
            </div>
          </div>
          <div className="h-1 bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div
            className="w-full select-none touch-none"
            style={{ perspective: '1000px' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { isPointerDown.current = false; setSwipeOffset(0); }}
          >
            <div
              className="w-full transition-transform duration-500 grid grid-cols-1"
              style={{
                transformStyle: 'preserve-3d',
                transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div
                className="col-start-1 row-start-1 rounded-2xl border-2 bg-card shadow-lg p-6 sm:p-8 cursor-pointer"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: !flying && !revealed ? `translateX(${swipeOffset}px)` : 'none',
                  transition: isPointerDown.current ? 'none' : undefined,
                }}
              >
                <div className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-4">
                  Q{currentQuestion.number}
                </div>
                <h3 className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                  {currentQuestion.question}
                </h3>
                <div className="text-center text-xs text-foreground/40 mt-6">
                  Tap to flip
                </div>
              </div>

              <div
                className="col-start-1 row-start-1 rounded-2xl border-2 bg-card shadow-lg p-6 sm:p-8 cursor-grab active:cursor-grabbing"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: `rotateY(180deg) translateX(${revealed ? swipeOffset : 0}px)`,
                  transition: isPointerDown.current ? 'none' : undefined,
                }}
              >
                <div className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-4">
                  Answer
                </div>
                <div className="border-l-4 border-primary/30 pl-4">
                  <span className="text-sm font-medium text-foreground leading-relaxed">
                    {correctText}
                  </span>
                </div>

                {exp && (
                  <div className="mt-4">
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      {exp.brief}
                    </p>
                    {exp.detailed && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
                          className="flex items-center gap-1 text-xs font-medium text-foreground/60 hover:text-foreground transition-colors mt-2"
                        >
                          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {expanded ? 'Less' : 'Detailed explanation'}
                        </button>
                        {expanded && (
                          <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{exp.detailed}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mt-6">
              <button
                onClick={() => revealed && advance(false)}
                disabled={!revealed}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all
                ${revealed
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 shadow-lg hover:scale-110 active:scale-95 cursor-pointer'
                  : 'bg-secondary/30 text-foreground/40 cursor-default'}`}
              >
                <XCircle className="w-7 h-7" />
              </button>
              <button
                onClick={() => revealed && advance(true)}
                disabled={!revealed}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all
                ${revealed
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 shadow-lg hover:scale-110 active:scale-95 cursor-pointer'
                  : 'bg-secondary/30 text-foreground/40 cursor-default'}`}
              >
                <CheckCircle2 className="w-7 h-7" />
              </button>
            </div>

          {reviewQueue.length > 0 && revealed && (
            <p className="text-center text-xs text-amber-600 font-medium mt-4">
              {reviewQueue.length} question{reviewQueue.length !== 1 ? 's' : ''} queued for review
            </p>
          )}

          <div className="text-center mt-4 text-xs text-foreground/70">
            <kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">Space</kbd> flip
            <span className="mx-1.5">·</span>
            <kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">→</kbd> knew
            <span className="mx-1.5">·</span>
            <kbd className="px-1.5 py-0.5 bg-background text-foreground border border-border rounded text-[10px] font-mono">←</kbd> missed
          </div>
        </div>
      </div>
    </div>
  );
}
