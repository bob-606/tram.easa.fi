import { useMemo } from 'react';
import { Scale, Brain, Cloud, Radio, Plane, ClipboardList, Calculator, Wrench, Compass, BookOpen, Trophy, Clock, TrendingUp } from 'lucide-react';
import type { Subject } from '@/types';
import type { SubjectProgress } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  Scale,
  Brain,
  Cloud,
  Radio,
  Plane,
  ClipboardList,
  Calculator,
  Wrench,
  Compass,
};

interface SubjectCardProps {
  subject: Subject;
  progress: SubjectProgress;
  onClick: () => void;
}

export function SubjectCard({ subject, progress, onClick }: SubjectCardProps) {
  const Icon = iconMap[subject.icon] || BookOpen;
  
  const stats = useMemo(() => {
    const answered = progress.questionsAnswered;
    const correct = progress.questionsCorrect;
    const total = subject.questionCount;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const progress_pct = Math.round((answered / total) * 100);
    return { answered, correct, total, accuracy, progress_pct };
  }, [progress, subject.questionCount]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm 
                 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 
                 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-border/40">
        <div 
          className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
          style={{ width: `${Math.min(stats.progress_pct, 100)}%` }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center 
                            group-hover:bg-primary/20 transition-colors">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {subject.number}
              </span>
              <h3 className="font-semibold text-sm text-foreground leading-tight">
                {subject.name}
              </h3>
            </div>
          </div>
          {stats.accuracy > 0 && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
              ${stats.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-600' : 
                stats.accuracy >= 60 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}>
              <TrendingUp className="w-3 h-3" />
              {stats.accuracy}%
            </div>
          )}
        </div>

        {/* Question count */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{subject.questionCount} questions</span>
        </div>

        {/* Stats row */}
        {progress.questionsAnswered > 0 ? (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/40">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Trophy className="w-3 h-3" />
                <span>Done</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{stats.answered}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="w-3 h-3" />
                <span>Acc</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{stats.accuracy}%</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" />
                <span>Time</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {formatTime(progress.totalTimeSeconds)}
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Not started yet</span>
              <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                Start studying
              </span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
