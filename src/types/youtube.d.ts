declare global {
  namespace YT {
    interface PlayerVars {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      rel?: 0 | 1;
      modestbranding?: 0 | 1;
    }

    interface PlayerOptions {
      width?: string | number;
      height?: string | number;
      videoId?: string;
      playerVars?: PlayerVars;
      events?: {
        onReady?: (event: OnReadyEvent) => void;
        onStateChange?: (event: OnStateChangeEvent) => void;
        onError?: (event: { data: number; target: Player }) => void;
      };
    }

    class Player {
      constructor(elementId: string | HTMLElement, options?: PlayerOptions);
      destroy(): void;
      playVideo(): void;
      pauseVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      loadVideoById(videoId: string): void;
      setPlaybackRate(rate: number): void;
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): number;
    }

    interface OnReadyEvent {
      target: Player;
    }

    interface OnStateChangeEvent {
      data: number;
      target: Player;
    }

    const PlayerState: {
      UNSTARTED: -1;
      ENDED: 0;
      PLAYING: 1;
      PAUSED: 2;
      BUFFERING: 3;
      CUED: 5;
    };
  }

  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
