type TopLoopStat = {
  title: string;
  loopCount: number;
} | null;

type StatsPanelProps = {
  title: string;
  totalPlayTimeLabel: string;
  topLoopLabel: string;
  noDataLabel: string;
  totalPlayTimeSeconds: number;
  topLoop: TopLoopStat;
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

export function StatsPanel({
  title,
  totalPlayTimeLabel,
  topLoopLabel,
  noDataLabel,
  totalPlayTimeSeconds,
  topLoop,
}: StatsPanelProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">{totalPlayTimeLabel}</p>
          <p className="stat-value">{formatPracticeDuration(totalPlayTimeSeconds)}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">{topLoopLabel}</p>
          <p className="stat-value">
            {topLoop ? `${topLoop.title} (${topLoop.loopCount})` : noDataLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
