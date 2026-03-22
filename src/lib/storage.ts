export type StoredLoopData = {
  start: number | null;
  end: number | null;
  enabled: boolean;
  playbackRate: number;
};

export function getLoopStorageKey(videoId: string): string {
  return `youtube-practice-loop:${videoId}`;
}

export function readLoopData(videoId: string): StoredLoopData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(getLoopStorageKey(videoId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredLoopData>;
    return {
      start: typeof parsed.start === "number" ? parsed.start : null,
      end: typeof parsed.end === "number" ? parsed.end : null,
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : false,
      playbackRate: typeof parsed.playbackRate === "number" ? parsed.playbackRate : 1,
    };
  } catch {
    return null;
  }
}

export function writeLoopData(videoId: string, data: StoredLoopData): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getLoopStorageKey(videoId), JSON.stringify(data));
}
