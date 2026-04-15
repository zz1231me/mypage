// client/src/components/boards/CommentReactionBar.tsx - 댓글 리액션 바
import { useState, useEffect } from 'react';
import { ReactionPicker } from './ReactionPicker';
import { toggleCommentReaction, getCommentReactions } from '../../api/reactions';
import { ReactionType } from '../../types/board.types';

interface CommentReactionBarProps {
  commentId: number;
  disabled?: boolean;
}

export function CommentReactionBar({ commentId, disabled }: CommentReactionBarProps) {
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCommentReactions(commentId)
      .then(data => {
        if (!mounted) return;
        setMyReaction(data.myReaction);
        setCounts(data.counts);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [commentId]);

  const handleReact = async (type: ReactionType) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await toggleCommentReaction(commentId, type);
      setMyReaction(result.myReaction);
      setCounts(result.counts);
    } catch {
      // 실패 시 조용히 무시
    } finally {
      setLoading(false);
    }
  };

  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  if (total === 0 && !myReaction && disabled) return null;

  return (
    <div className="mt-1.5">
      <ReactionPicker
        myReaction={myReaction}
        counts={counts}
        onReact={handleReact}
        disabled={disabled || loading}
        compact
      />
    </div>
  );
}
