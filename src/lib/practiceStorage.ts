import type {LoopProgressMap, PracticeLoop} from '@/types/practice';

function getLoopsStorageKey(videoId: string): string {
  return `youtube-practice-library:${videoId}`;
}

function getProgressStorageKey(videoId: string): string {
  return `youtube-practice-progress:${videoId}`;
}

export function readPracticeLoops(videoId: string): PracticeLoop[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(getLoopsStorageKey(videoId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PracticeLoop[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      loop =>
        typeof loop.id === 'string' &&
        typeof loop.videoId === 'string' &&
        typeof loop.start_time === 'number' &&
        typeof loop.end_time === 'number' &&
        typeof loop.title === 'string' &&
        Array.isArray(loop.tags) &&
        typeof loop.created_at === 'string',
    );
  } catch {
    return [];
  }
}

export function writePracticeLoops(videoId: string, loops: PracticeLoop[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getLoopsStorageKey(videoId), JSON.stringify(loops));
}

export function readPracticeProgress(videoId: string): LoopProgressMap {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.localStorage.getItem(getProgressStorageKey(videoId));
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as LoopProgressMap;
    const normalized: LoopProgressMap = {};

    Object.entries(parsed).forEach(([key, value]) => {
      if (
        value &&
        typeof value.loop_count === 'number' &&
        typeof value.total_play_time === 'number' &&
        (typeof value.last_played_at === 'string' || value.last_played_at === null)
      ) {
        normalized[key] = value;
      }
    });

    return normalized;
  } catch {
    return {};
  }
}

export function writePracticeProgress(
  videoId: string,
  progressByLoopId: LoopProgressMap,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getProgressStorageKey(videoId),
    JSON.stringify(progressByLoopId),
  );
}
