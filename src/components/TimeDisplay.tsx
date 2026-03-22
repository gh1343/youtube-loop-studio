import { formatTime } from "@/lib/time";

type TimeDisplayProps = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  title: string;
  playingLabel: string;
  pausedLabel: string;
};

export function TimeDisplay({
  currentTime,
  duration,
  isPlaying,
  title,
  playingLabel,
  pausedLabel,
}: TimeDisplayProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      <p className="time-value">
        {formatTime(currentTime)} / {formatTime(duration)}
      </p>
      <p className="status-text">{isPlaying ? playingLabel : pausedLabel}</p>
    </section>
  );
}
