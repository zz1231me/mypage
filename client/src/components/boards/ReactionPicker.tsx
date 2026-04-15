import React, { useState, useRef, useEffect } from 'react';
import { ReactionType } from '../../types/board.types';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: '좋아요' },
  { type: 'love', emoji: '❤️', label: '사랑해요' },
  { type: 'haha', emoji: '😂', label: '웃겨요' },
  { type: 'wow', emoji: '😮', label: '놀라워요' },
  { type: 'sad', emoji: '😢', label: '슬퍼요' },
  { type: 'angry', emoji: '😡', label: '화나요' },
];

interface ReactionPickerProps {
  myReaction: ReactionType | null;
  counts: Record<string, number>;
  onReact: (type: ReactionType) => void;
  disabled?: boolean;
  /** compact 모드: 버튼 크기 축소 (댓글 리액션용) */
  compact?: boolean;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  myReaction,
  counts,
  onReact,
  disabled,
  compact = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const myReactionData = REACTIONS.find(r => r.type === myReaction);

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Main reaction button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowPicker(prev => !prev)}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => setShowPicker(false), 200);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all
          ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
          ${
            myReaction
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-600'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-transparent'
          }
          disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="반응 선택"
      >
        <span>{myReactionData ? myReactionData.emoji : '👍'}</span>
        {!compact && <span>{myReactionData ? myReactionData.label : '반응'}</span>}
        {totalCount > 0 && <span className="font-bold">{totalCount}</span>}
      </button>

      {/* Reaction breakdown */}
      {totalCount > 0 && (
        <div className="flex items-center gap-1">
          {REACTIONS.filter(r => (counts[r.type] || 0) > 0).map(r => (
            <span
              key={r.type}
              className="inline-flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400"
            >
              {r.emoji} {counts[r.type]}
            </span>
          ))}
        </div>
      )}

      {/* Picker popup */}
      {showPicker && (
        <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-600 flex items-center p-1.5 gap-1 z-50">
          {REACTIONS.map(r => (
            <button
              key={r.type}
              type="button"
              onClick={() => {
                onReact(r.type);
                setShowPicker(false);
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-700
                ${myReaction === r.type ? 'bg-primary-100 dark:bg-primary-900/30 scale-110' : ''}`}
              title={r.label}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
