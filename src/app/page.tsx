'use client';

import {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {KeyboardShortcuts} from '@/components/KeyboardShortcuts';
import {LoopControls} from '@/components/LoopControls';
import {LoopList} from '@/components/LoopList';
import {SpeedControl} from '@/components/SpeedControl';
import {StatsPanel} from '@/components/StatsPanel';
import {TagInput} from '@/components/TagInput';
import {TimeDisplay} from '@/components/TimeDisplay';
import {VideoUrlInput} from '@/components/VideoUrlInput';
import {YouTubePlayerFrame} from '@/components/YouTubePlayerFrame';
import {useYouTubeIframeApi} from '@/hooks/useYouTubeIframeApi';
import {LOCALE_STORAGE_KEY, type Locale, UI_TEXT} from '@/lib/i18n';
import {
  readPracticeLoops,
  readPracticeProgress,
  writePracticeLoops,
  writePracticeProgress,
} from '@/lib/practiceStorage';
import {readLoopData, writeLoopData} from '@/lib/storage';
import {parseTimeInputToSeconds} from '@/lib/time';
import {extractVideoId} from '@/lib/youtube';
import type {LoopProgressMap, PracticeLoop} from '@/types/practice';

type PracticeState = {
  loops: PracticeLoop[];
  progressByLoopId: LoopProgressMap;
  activeLoopId: string | null;
  filterTag: string | null;
};

type PracticeAction =
  | {type: 'hydrate'; loops: PracticeLoop[]; progressByLoopId: LoopProgressMap}
  | {type: 'addLoop'; loop: PracticeLoop}
  | {type: 'deleteLoop'; loopId: string}
  | {type: 'setActiveLoop'; loopId: string | null}
  | {type: 'setFilterTag'; tag: string | null}
  | {type: 'addPlayTime'; loopId: string; seconds: number}
  | {type: 'incrementLoopCount'; loopId: string; playedAt: string};

const initialPracticeState: PracticeState = {
  loops: [],
  progressByLoopId: {},
  activeLoopId: null,
  filterTag: null,
};

function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'hydrate':
      return {
        loops: action.loops,
        progressByLoopId: action.progressByLoopId,
        activeLoopId: null,
        filterTag: null,
      };

    case 'addLoop':
      return {
        ...state,
        loops: [action.loop, ...state.loops],
      };

    case 'deleteLoop': {
      const nextProgress = {...state.progressByLoopId};
      delete nextProgress[action.loopId];
      return {
        ...state,
        loops: state.loops.filter(loop => loop.id !== action.loopId),
        progressByLoopId: nextProgress,
        activeLoopId: state.activeLoopId === action.loopId ? null : state.activeLoopId,
      };
    }

    case 'setActiveLoop':
      return {
        ...state,
        activeLoopId: action.loopId,
      };

    case 'setFilterTag':
      return {
        ...state,
        filterTag: action.tag,
      };

    case 'addPlayTime': {
      if (action.seconds <= 0) {
        return state;
      }
      const current = state.progressByLoopId[action.loopId] ?? {
        loop_count: 0,
        total_play_time: 0,
        last_played_at: null,
      };
      return {
        ...state,
        progressByLoopId: {
          ...state.progressByLoopId,
          [action.loopId]: {
            ...current,
            total_play_time: current.total_play_time + action.seconds,
          },
        },
      };
    }

    case 'incrementLoopCount': {
      const current = state.progressByLoopId[action.loopId] ?? {
        loop_count: 0,
        total_play_time: 0,
        last_played_at: null,
      };
      return {
        ...state,
        progressByLoopId: {
          ...state.progressByLoopId,
          [action.loopId]: {
            ...current,
            loop_count: current.loop_count + 1,
            last_played_at: action.playedAt,
          },
        },
      };
    }

    default:
      return state;
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

function applyPlaybackRateSafely(player: unknown, playbackRate: number): void {
  if (typeof player !== 'object' || player === null) {
    return;
  }

  const maybePlayer = player as {setPlaybackRate?: (rate: number) => void};
  if (!isFunction(maybePlayer.setPlaybackRate)) {
    return;
  }

  try {
    maybePlayer.setPlaybackRate(playbackRate);
  } catch {
    // Ignore unsupported playback-rate calls from non-standard player objects.
  }
}

function getCurrentTimeSafely(player: unknown): number | null {
  if (typeof player !== 'object' || player === null) {
    return null;
  }
  const maybeGetter = (player as {getCurrentTime?: () => number}).getCurrentTime;
  if (!isFunction(maybeGetter)) {
    return null;
  }
  try {
    const value = maybeGetter.call(player);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function getDurationSafely(player: unknown): number | null {
  if (typeof player !== 'object' || player === null) {
    return null;
  }
  const maybeGetter = (player as {getDuration?: () => number}).getDuration;
  if (!isFunction(maybeGetter)) {
    return null;
  }
  try {
    const value = maybeGetter.call(player);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function getPlayerStateSafely(player: unknown): number | null {
  if (typeof player !== 'object' || player === null) {
    return null;
  }
  const maybeGetter = (player as {getPlayerState?: () => number}).getPlayerState;
  if (!isFunction(maybeGetter)) {
    return null;
  }
  try {
    const value = maybeGetter.call(player);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function playVideoSafely(player: unknown): void {
  if (typeof player !== 'object' || player === null) {
    return;
  }
  const maybePlay = (player as {playVideo?: () => void}).playVideo;
  if (!isFunction(maybePlay)) {
    return;
  }
  try {
    maybePlay.call(player);
  } catch {
    // Ignore unsupported player calls.
  }
}

function pauseVideoSafely(player: unknown): void {
  if (typeof player !== 'object' || player === null) {
    return;
  }
  const maybePause = (player as {pauseVideo?: () => void}).pauseVideo;
  if (!isFunction(maybePause)) {
    return;
  }
  try {
    maybePause.call(player);
  } catch {
    // Ignore unsupported player calls.
  }
}

function seekToSafely(player: unknown, seconds: number): void {
  if (typeof player !== 'object' || player === null) {
    return;
  }
  const maybeSeek = (
    player as {seekTo?: (value: number, allowSeekAhead: boolean) => void}
  ).seekTo;
  if (!isFunction(maybeSeek)) {
    return;
  }
  try {
    maybeSeek.call(player, seconds, true);
  } catch {
    // Ignore unsupported player calls.
  }
}

function destroyPlayerSafely(player: unknown): void {
  if (typeof player !== 'object' || player === null) {
    return;
  }
  const maybeDestroy = (player as {destroy?: () => void}).destroy;
  if (!isFunction(maybeDestroy)) {
    return;
  }
  try {
    maybeDestroy.call(player);
  } catch {
    // Ignore unsupported player calls.
  }
}

function createLoopId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `loop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomePage() {
  const apiReady = useYouTubeIframeApi();

  const hotkeyFocusRef = useRef<HTMLButtonElement>(null);
  const focusRecoveryTimersRef = useRef<number[]>([]);
  const playTrackerRef = useRef<{loopId: string | null; lastTick: number | null; carry: number}>({
    loopId: null,
    lastTick: null,
    carry: 0,
  });
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const playbackRateRef = useRef<number>(1);

  const [practiceState, dispatchPractice] = useReducer(practiceReducer, initialPracticeState);
  const {loops, progressByLoopId, activeLoopId, filterTag} = practiceState;

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('ko');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [loadedStorageForVideo, setLoadedStorageForVideo] = useState<boolean>(false);
  const [loadedPracticeForVideo, setLoadedPracticeForVideo] = useState<boolean>(false);

  const [newLoopTitle, setNewLoopTitle] = useState<string>('');
  const [newLoopTags, setNewLoopTags] = useState<string[]>([]);

  const text = UI_TEXT[locale];
  const canEnableLoop = useMemo(
    () => loopStart !== null && loopEnd !== null && loopEnd > loopStart,
    [loopStart, loopEnd],
  );

  const practiceText = locale === 'ko'
    ? {
        saveSectionTitle: '현재 구간 저장',
        saveTitleLabel: '구간 이름',
        saveTitlePlaceholder: '예: 인트로 리프, 솔로1',
        saveButton: '구간 저장',
        saveTitleRequired: '구간 이름을 입력하세요.',
        savedNotice: '구간이 라이브러리에 저장되었습니다.',
        libraryTitle: '연습 구간 라이브러리',
        libraryEmpty: '저장된 구간이 없습니다. A-B를 맞추고 저장해보세요.',
        allTags: '전체',
        tagLabel: '태그',
        tagPlaceholder: '태그 입력 후 Enter (예: alternate)',
        addTag: '추가',
        removeTag: '태그 삭제',
        selectLoop: '구간 재생',
        deleteLoop: '삭제',
        loopDeleted: '구간이 삭제되었습니다.',
        playedCount: '반복 횟수',
        playedTime: '연습 시간',
        statsTitle: '연습 통계',
        totalPracticeTime: '총 연습 시간',
        mostRepeatedLoop: '가장 많이 반복한 구간',
        noStats: '기록 없음',
      }
    : {
        saveSectionTitle: 'Save Current Range',
        saveTitleLabel: 'Range title',
        saveTitlePlaceholder: 'e.g. Intro riff, Solo 1',
        saveButton: 'Save Range',
        saveTitleRequired: 'Please enter a title.',
        savedNotice: 'Range saved to library.',
        libraryTitle: 'Practice Range Library',
        libraryEmpty: 'No saved ranges yet. Set A-B and save one.',
        allTags: 'All',
        tagLabel: 'Tags',
        tagPlaceholder: 'Type a tag and press Enter (e.g. alternate)',
        addTag: 'Add',
        removeTag: 'Remove tag',
        selectLoop: 'Play range',
        deleteLoop: 'Delete',
        loopDeleted: 'Range deleted.',
        playedCount: 'Loop count',
        playedTime: 'Practice time',
        statsTitle: 'Practice Stats',
        totalPracticeTime: 'Total practice time',
        mostRepeatedLoop: 'Most repeated range',
        noStats: 'No data',
      };

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const allKnownTags = useMemo(() => {
    const unique = new Set<string>();
    loops.forEach(loop => {
      loop.tags.forEach(tag => unique.add(tag));
    });
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [loops]);

  const filteredLoops = useMemo(() => {
    if (!filterTag) {
      return loops;
    }
    return loops.filter(loop => loop.tags.includes(filterTag));
  }, [loops, filterTag]);

  const totalPracticeSeconds = useMemo(
    () =>
      Object.values(progressByLoopId).reduce(
        (sum, progress) => sum + progress.total_play_time,
        0,
      ),
    [progressByLoopId],
  );

  const mostRepeatedLoop = useMemo(() => {
    let winner: {title: string; loopCount: number} | null = null;

    for (const loop of loops) {
      const count = progressByLoopId[loop.id]?.loop_count ?? 0;
      if (winner === null || count > winner.loopCount) {
        winner = {title: loop.title, loopCount: count};
      }
    }

    if (winner && winner.loopCount > 0) {
      return winner;
    }

    return null;
  }, [loops, progressByLoopId]);

  const applyLoopStart = useCallback(
    (nextStart: number | null) => {
      setLoopStart(nextStart);
      dispatchPractice({type: 'setActiveLoop', loopId: null});
      if (nextStart !== null && loopEnd !== null && nextStart > loopEnd) {
        setLoopEnd(null);
      }
    },
    [loopEnd],
  );

  const applyLoopEnd = useCallback((nextEnd: number | null) => {
    setLoopEnd(nextEnd);
    dispatchPractice({type: 'setActiveLoop', loopId: null});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale === 'ko' || storedLocale === 'en') {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const reclaimFocusFromIframe = useCallback(() => {
    focusRecoveryTimersRef.current.forEach(timerId => {
      window.clearTimeout(timerId);
    });
    focusRecoveryTimersRef.current = [];

    [0, 40, 120, 220].forEach(delayMs => {
      const timerId = window.setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLIFrameElement) {
          hotkeyFocusRef.current?.focus({preventScroll: true});
        }
      }, delayMs);
      focusRecoveryTimersRef.current.push(timerId);
    });
  }, []);

  useEffect(() => {
    const onWindowBlur = () => {
      reclaimFocusFromIframe();
    };

    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      focusRecoveryTimersRef.current.forEach(timerId => {
        window.clearTimeout(timerId);
      });
      focusRecoveryTimersRef.current = [];
    };
  }, [reclaimFocusFromIframe]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLIFrameElement) {
        hotkeyFocusRef.current?.focus({preventScroll: true});
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  const setLoopStartFromCurrent = useCallback(() => {
    const liveTime = getCurrentTimeSafely(playerRef.current);
    const nextStart = liveTime ?? currentTime;
    applyLoopStart(Math.floor(nextStart));
  }, [applyLoopStart, currentTime]);

  const setLoopEndFromCurrent = useCallback(() => {
    const liveTime = getCurrentTimeSafely(playerRef.current);
    const nextEnd = liveTime ?? currentTime;
    applyLoopEnd(Math.floor(nextEnd));
  }, [applyLoopEnd, currentTime]);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player || !window.YT?.PlayerState) {
      return;
    }

    if (getPlayerStateSafely(player) === window.YT.PlayerState.PLAYING) {
      pauseVideoSafely(player);
      return;
    }

    playVideoSafely(player);
  }, []);

  const toggleLoop = useCallback(() => {
    if (!canEnableLoop) {
      setNotice(text.loop.invalidRange);
      return;
    }

    if (!loopEnabled && loopStart !== null) {
      seekToSafely(playerRef.current, loopStart);
      playVideoSafely(playerRef.current);
    }

    setNotice(null);
    setLoopEnabled(prev => !prev);
  }, [canEnableLoop, loopEnabled, loopStart, text.loop.invalidRange]);

  const handleLoadVideo = useCallback(() => {
    const parsedVideoId = extractVideoId(videoUrl);
    if (!parsedVideoId) {
      setUrlError(text.video.invalidUrl);
      return;
    }

    setUrlError(null);
    setNotice(null);
    setVideoId(parsedVideoId);
  }, [videoUrl, text.video.invalidUrl]);

  const handleSaveCurrentRange = useCallback(() => {
    if (!videoId) {
      return;
    }
    if (!canEnableLoop || loopStart === null || loopEnd === null) {
      setNotice(text.loop.invalidRange);
      return;
    }
    if (newLoopTitle.trim().length === 0) {
      setNotice(practiceText.saveTitleRequired);
      return;
    }

    const newLoop: PracticeLoop = {
      id: createLoopId(),
      videoId,
      start_time: loopStart,
      end_time: loopEnd,
      title: newLoopTitle.trim(),
      tags: newLoopTags,
      created_at: new Date().toISOString(),
    };

    dispatchPractice({type: 'addLoop', loop: newLoop});
    dispatchPractice({type: 'setActiveLoop', loopId: newLoop.id});
    setNewLoopTitle('');
    setNewLoopTags([]);
    setNotice(practiceText.savedNotice);
  }, [
    videoId,
    canEnableLoop,
    loopStart,
    loopEnd,
    newLoopTitle,
    newLoopTags,
    text.loop.invalidRange,
    practiceText.saveTitleRequired,
    practiceText.savedNotice,
  ]);

  const handleSelectSavedLoop = useCallback((loop: PracticeLoop) => {
    applyLoopStart(loop.start_time);
    setLoopEnd(loop.end_time);
    setLoopEnabled(true);
    seekToSafely(playerRef.current, loop.start_time);
    playVideoSafely(playerRef.current);
    dispatchPractice({type: 'setActiveLoop', loopId: loop.id});
    setNotice(null);
  }, [applyLoopStart]);

  const handleDeleteSavedLoop = useCallback((loop: PracticeLoop) => {
    dispatchPractice({type: 'deleteLoop', loopId: loop.id});
    if (activeLoopId === loop.id) {
      setLoopEnabled(false);
    }
    setNotice(practiceText.loopDeleted);
  }, [activeLoopId, practiceText.loopDeleted]);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    setLoadedStorageForVideo(false);
    const stored = readLoopData(videoId);
    if (stored) {
      const normalizedStart =
        stored.start === null ? null : Math.floor(stored.start);
      const normalizedEnd = stored.end === null ? null : Math.floor(stored.end);
      setLoopStart(normalizedStart);
      setLoopEnd(normalizedEnd);
      setLoopEnabled(
        stored.enabled &&
          normalizedStart !== null &&
          normalizedEnd !== null &&
          normalizedEnd > normalizedStart,
      );
      setPlaybackRate(stored.playbackRate);
    } else {
      setLoopStart(null);
      setLoopEnd(null);
      setLoopEnabled(false);
      setPlaybackRate(1);
    }
    setLoadedStorageForVideo(true);
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !loadedStorageForVideo) {
      return;
    }

    writeLoopData(videoId, {
      start: loopStart,
      end: loopEnd,
      enabled: loopEnabled,
      playbackRate,
    });
  }, [
    videoId,
    loopStart,
    loopEnd,
    loopEnabled,
    playbackRate,
    loadedStorageForVideo,
  ]);

  useEffect(() => {
    if (!videoId) {
      return;
    }
    setLoadedPracticeForVideo(false);
    dispatchPractice({
      type: 'hydrate',
      loops: readPracticeLoops(videoId),
      progressByLoopId: readPracticeProgress(videoId),
    });
    setNewLoopTitle('');
    setNewLoopTags([]);
    setLoadedPracticeForVideo(true);
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !loadedPracticeForVideo) {
      return;
    }
    writePracticeLoops(videoId, loops);
  }, [videoId, loops, loadedPracticeForVideo]);

  useEffect(() => {
    if (!videoId || !loadedPracticeForVideo) {
      return;
    }
    writePracticeProgress(videoId, progressByLoopId);
  }, [videoId, progressByLoopId, loadedPracticeForVideo]);

  useEffect(() => {
    if (
      !apiReady ||
      !videoId ||
      !playerContainerRef.current ||
      !window.YT?.Player
    ) {
      return;
    }

    if (playerRef.current) {
      destroyPlayerSafely(playerRef.current);
      playerRef.current = null;
    }

    const player = new window.YT.Player(playerContainerRef.current, {
      videoId,
      playerVars: {
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: event => {
          playerRef.current = event.target;
          applyPlaybackRateSafely(event.target, playbackRateRef.current);
          const loadedDuration = getDurationSafely(event.target);
          if (loadedDuration !== null && loadedDuration > 0) {
            setDuration(loadedDuration);
          }
        },
        onStateChange: event => {
          if (!window.YT?.PlayerState) {
            return;
          }
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        },
      },
    });

    playerRef.current = null;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    return () => {
      destroyPlayerSafely(player);
      playerRef.current = null;
    };
  }, [apiReady, videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    applyPlaybackRateSafely(player, playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    if (loopEnabled && !canEnableLoop) {
      setLoopEnabled(false);
    }
  }, [loopEnabled, canEnableLoop]);

  useEffect(() => {
    playTrackerRef.current = {
      loopId: null,
      lastTick: null,
      carry: 0,
    };
  }, [videoId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) {
        return;
      }

      const nextCurrent = getCurrentTimeSafely(player);
      const nextDuration = getDurationSafely(player);
      if (nextCurrent === null) {
        return;
      }

      setCurrentTime(nextCurrent);
      if (nextDuration !== null && nextDuration > 0) {
        setDuration(nextDuration);
      }

      const tracker = playTrackerRef.current;
      const trackingLoopId = loopEnabled ? activeLoopId : null;
      if (tracker.loopId !== trackingLoopId) {
        if (tracker.loopId && tracker.carry >= 1) {
          dispatchPractice({
            type: 'addPlayTime',
            loopId: tracker.loopId,
            seconds: Math.floor(tracker.carry),
          });
        }
        tracker.loopId = trackingLoopId;
        tracker.lastTick = null;
        tracker.carry = 0;
      }

      const playerState = getPlayerStateSafely(player);
      const isActuallyPlaying =
        window.YT?.PlayerState && playerState === window.YT.PlayerState.PLAYING;

      if (tracker.loopId && isActuallyPlaying) {
        const now = Date.now();
        if (tracker.lastTick !== null) {
          tracker.carry += (now - tracker.lastTick) / 1000;
        }
        tracker.lastTick = now;

        if (tracker.carry >= 1) {
          const wholeSeconds = Math.floor(tracker.carry);
          tracker.carry -= wholeSeconds;
          dispatchPractice({
            type: 'addPlayTime',
            loopId: tracker.loopId,
            seconds: wholeSeconds,
          });
        }
      } else {
        tracker.lastTick = null;
      }

      if (
        loopEnabled &&
        canEnableLoop &&
        loopStart !== null &&
        loopEnd !== null &&
        nextCurrent >= loopEnd
      ) {
        seekToSafely(player, loopStart);
        if (
          window.YT?.PlayerState &&
          getPlayerStateSafely(player) !== window.YT.PlayerState.PLAYING
        ) {
          playVideoSafely(player);
        }

        if (activeLoopId) {
          dispatchPractice({
            type: 'incrementLoopCount',
            loopId: activeLoopId,
            playedAt: new Date().toISOString(),
          });
        }
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [loopEnabled, loopStart, loopEnd, canEnableLoop, activeLoopId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const allowGlobalShortcutFromUrlInput =
        target instanceof HTMLInputElement &&
        target.dataset.shortcutScope === 'global';

      if (isEditableTarget(target) && !allowGlobalShortcutFromUrlInput) {
        return;
      }

      const key = event.key.toLowerCase();
      const code = event.code;

      if (key === 's' || code === 'KeyS') {
        event.preventDefault();
        setLoopStartFromCurrent();
        return;
      }

      if (key === 'e' || code === 'KeyE') {
        event.preventDefault();
        setLoopEndFromCurrent();
        return;
      }

      if (key === 'r' || code === 'KeyR') {
        event.preventDefault();
        toggleLoop();
        return;
      }

      if (code === 'Space') {
        event.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setLoopStartFromCurrent, setLoopEndFromCurrent, toggleLoop, togglePlayPause]);

  return (
    <main className="page">
      <button
        type="button"
        ref={hotkeyFocusRef}
        className="hotkey-focus-anchor"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="container">
        <header className="header">
          <div className="header-top">
            <h1>{text.page.title}</h1>
            <div
              className="language-switch"
              role="group"
              aria-label={text.page.languageSwitcherLabel}
            >
              <button
                type="button"
                className={`lang-button ${locale === 'ko' ? 'lang-button-active' : ''}`}
                onClick={() => setLocale('ko')}
              >
                {text.page.languageKorean}
              </button>
              <button
                type="button"
                className={`lang-button ${locale === 'en' ? 'lang-button-active' : ''}`}
                onClick={() => setLocale('en')}
              >
                {text.page.languageEnglish}
              </button>
            </div>
          </div>
          <p>{text.page.subtitle}</p>
        </header>

        <VideoUrlInput
          value={videoUrl}
          onChange={setVideoUrl}
          onSubmit={handleLoadVideo}
          errorMessage={urlError}
          title={text.video.title}
          placeholder={text.video.placeholder}
          inputAriaLabel={text.video.inputAriaLabel}
          loadLabel={text.video.load}
        />

        <YouTubePlayerFrame
          playerContainerRef={playerContainerRef}
          hasVideo={Boolean(videoId)}
          title={text.player.title}
          placeholder={text.player.placeholder}
          onShellMouseDown={reclaimFocusFromIframe}
        />

        <section className="controls-grid">
          <TimeDisplay
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            title={text.timeline.title}
            playingLabel={text.timeline.playing}
            pausedLabel={text.timeline.paused}
          />

          <SpeedControl
            value={playbackRate}
            onChange={setPlaybackRate}
            title={text.speed.title}
            label={text.speed.label}
          />

          <StatsPanel
            title={practiceText.statsTitle}
            totalPlayTimeLabel={practiceText.totalPracticeTime}
            topLoopLabel={practiceText.mostRepeatedLoop}
            noDataLabel={practiceText.noStats}
            totalPlayTimeSeconds={totalPracticeSeconds}
            topLoop={mostRepeatedLoop}
          />

          <KeyboardShortcuts
            title={text.shortcuts.title}
            setStartLabel={text.shortcuts.setStart}
            setEndLabel={text.shortcuts.setEnd}
            toggleLoopLabel={text.shortcuts.toggleLoop}
            playPauseLabel={text.shortcuts.playPause}
          />

          <LoopControls
            start={loopStart}
            end={loopEnd}
            enabled={loopEnabled}
            onStartValueChange={value => {
              if (value.trim() === '') {
                applyLoopStart(null);
                return;
              }
              const parsed = parseTimeInputToSeconds(value);
              if (parsed !== null) {
                applyLoopStart(parsed);
              }
            }}
            onEndValueChange={value => {
              if (value.trim() === '') {
                applyLoopEnd(null);
                return;
              }
              const parsed = parseTimeInputToSeconds(value);
              if (parsed !== null) {
                applyLoopEnd(parsed);
              }
            }}
            onSetStartFromCurrent={setLoopStartFromCurrent}
            onSetEndFromCurrent={setLoopEndFromCurrent}
            onToggleLoop={toggleLoop}
            title={text.loop.title}
            startLabel={text.loop.startLabel}
            endLabel={text.loop.endLabel}
            setCurrentStartLabel={text.loop.setCurrentStart}
            setCurrentEndLabel={text.loop.setCurrentEnd}
            rangeLabel={text.loop.rangeLabel}
            rangeSeparator={text.loop.rangeSeparator}
            enableLabel={text.loop.enable}
            disableLabel={text.loop.disable}
          />
        </section>

        <section className="practice-workspace">
          <section className="panel">
            <h2 className="panel-title">{practiceText.saveSectionTitle}</h2>

            <label className="field-label" htmlFor="loop-title-input">
              {practiceText.saveTitleLabel}
            </label>
            <input
              id="loop-title-input"
              className="url-input"
              value={newLoopTitle}
              placeholder={practiceText.saveTitlePlaceholder}
              onChange={event => setNewLoopTitle(event.target.value)}
            />

            <TagInput
              label={practiceText.tagLabel}
              placeholder={practiceText.tagPlaceholder}
              addLabel={practiceText.addTag}
              removeLabel={practiceText.removeTag}
              tags={newLoopTags}
              suggestions={allKnownTags}
              onChange={setNewLoopTags}
            />

            <button
              type="button"
              className="primary-button save-range-button"
              onClick={handleSaveCurrentRange}
            >
              {practiceText.saveButton}
            </button>
            {notice && <p className="notice-text">{notice}</p>}
          </section>

          <LoopList
            title={practiceText.libraryTitle}
            emptyLabel={practiceText.libraryEmpty}
            allTagLabel={practiceText.allTags}
            filterTag={filterTag}
            availableTags={allKnownTags}
            loops={filteredLoops}
            activeLoopId={activeLoopId}
            progressByLoopId={progressByLoopId}
            playedCountLabel={practiceText.playedCount}
            playedTimeLabel={practiceText.playedTime}
            selectLabel={practiceText.selectLoop}
            deleteLabel={practiceText.deleteLoop}
            onChangeFilterTag={tag => dispatchPractice({type: 'setFilterTag', tag})}
            onSelectLoop={handleSelectSavedLoop}
            onDeleteLoop={handleDeleteSavedLoop}
          />
        </section>
      </div>
    </main>
  );
}
