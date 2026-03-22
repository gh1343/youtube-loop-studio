import {LoopItem} from '@/components/LoopItem';
import type {LoopProgressMap, PracticeLoop} from '@/types/practice';

type LoopListProps = {
  title: string;
  emptyLabel: string;
  allTagLabel: string;
  filterTag: string | null;
  availableTags: string[];
  loops: PracticeLoop[];
  activeLoopId: string | null;
  progressByLoopId: LoopProgressMap;
  playedCountLabel: string;
  playedTimeLabel: string;
  selectLabel: string;
  deleteLabel: string;
  onChangeFilterTag: (tag: string | null) => void;
  onSelectLoop: (loop: PracticeLoop) => void;
  onDeleteLoop: (loop: PracticeLoop) => void;
};

export function LoopList({
  title,
  emptyLabel,
  allTagLabel,
  filterTag,
  availableTags,
  loops,
  activeLoopId,
  progressByLoopId,
  playedCountLabel,
  playedTimeLabel,
  selectLabel,
  deleteLabel,
  onChangeFilterTag,
  onSelectLoop,
  onDeleteLoop,
}: LoopListProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>

      <div className="tag-filter-row">
        <button
          type="button"
          className={`tag-button ${filterTag === null ? 'tag-button-active' : ''}`}
          onClick={() => onChangeFilterTag(null)}
        >
          {allTagLabel}
        </button>

        {availableTags.map(tag => (
          <button
            key={tag}
            type="button"
            className={`tag-button ${filterTag === tag ? 'tag-button-active' : ''}`}
            onClick={() => onChangeFilterTag(tag)}
          >
            #{tag}
          </button>
        ))}
      </div>

      {loops.length === 0 ? (
        <p className="loop-empty">{emptyLabel}</p>
      ) : (
        <div className="loop-list">
          {loops.map(loop => (
            <LoopItem
              key={loop.id}
              loop={loop}
              isActive={activeLoopId === loop.id}
              progress={progressByLoopId[loop.id] ?? null}
              playedCountLabel={playedCountLabel}
              playedTimeLabel={playedTimeLabel}
              selectLabel={selectLabel}
              deleteLabel={deleteLabel}
              onSelect={() => onSelectLoop(loop)}
              onDelete={() => onDeleteLoop(loop)}
              onTagClick={tag => onChangeFilterTag(tag)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
