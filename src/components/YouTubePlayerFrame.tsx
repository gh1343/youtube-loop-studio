import { RefObject } from "react";

type YouTubePlayerFrameProps = {
  playerContainerRef: RefObject<HTMLDivElement>;
  hasVideo: boolean;
  title: string;
  placeholder: string;
  onShellMouseDown?: () => void;
};

export function YouTubePlayerFrame({
  playerContainerRef,
  hasVideo,
  title,
  placeholder,
  onShellMouseDown,
}: YouTubePlayerFrameProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      <div className="player-shell" onMouseDown={onShellMouseDown}>
        {!hasVideo && <div className="player-placeholder">{placeholder}</div>}
        <div ref={playerContainerRef} className="player-frame" />
      </div>
    </section>
  );
}
