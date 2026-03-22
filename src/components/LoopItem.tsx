import {formatTime} from '@/lib/time';
import type {LoopProgress, PracticeLoop} from '@/types/practice';

type LoopItemProps = {
  loop: PracticeLoop;
  isActive: boolean;
  progress: LoopProgress | null;
  playedCountLabel: string;
  playedTimeLabel: string;
  selectLabel: string;
  deleteLabel: string;
  onSelect: () => void;
  onDelete: () => void;
  onTagClick: (tag: string) => void;
};

function formatPracticeDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function LoopItem({
  loop,
  isActive,
  progress,
  playedCountLabel,
  playedTimeLabel,
  selectLabel,
  deleteLabel,
  onSelect,
  onDelete,
  onTagClick,
}: LoopItemProps) {
  return (
    <article
      className={`loop-item ${isActive ? 'loop-item-active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${selectLabel}: ${loop.title}`}
      onClick={onSelect}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="loop-item-main">
        <p className="loop-item-title">{loop.title}</p>
        <p className="loop-item-range">
          {formatTime(loop.start_time)} - {formatTime(loop.end_time)}
        </p>
      </div>

      <div className="loop-item-tags">
        {loop.tags.map(tag => (
          <button
            key={tag}
            type="button"
            className="tag-button"
            onClick={event => {
              event.stopPropagation();
              onTagClick(tag);
            }}
          >
            #{tag}
          </button>
        ))}
      </div>

      <div className="loop-item-progress">
        <span>
          {playedCountLabel}: {progress?.loop_count ?? 0}
        </span>
        <span>
          {playedTimeLabel}: {formatPracticeDuration(progress?.total_play_time ?? 0)}
        </span>
      </div>

      <button
        type="button"
        className="loop-delete-button"
        onClick={event => {
          event.stopPropagation();
          onDelete();
        }}
        aria-label={`${deleteLabel}: ${loop.title}`}
      >
        {deleteLabel}
      </button>
    </article>
  );
}
