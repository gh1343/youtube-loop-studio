'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// import {KeyboardShortcuts} from '@/components/KeyboardShortcuts';
import {LoopControls} from '@/components/LoopControls';
import {SpeedControl} from '@/components/SpeedControl';
import {TimeDisplay} from '@/components/TimeDisplay';
import {VideoUrlInput} from '@/components/VideoUrlInput';
import {YouTubePlayerFrame} from '@/components/YouTubePlayerFrame';
import {useYouTubeIframeApi} from '@/hooks/useYouTubeIframeApi';
import {LOCALE_STORAGE_KEY, type Locale, UI_TEXT} from '@/lib/i18n';
import {readLoopData, writeLoopData} from '@/lib/storage';
import {parseTimeInputToSeconds} from '@/lib/time';
import {extractVideoId} from '@/lib/youtube';

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
  if (typeof maybePlayer.setPlaybackRate !== 'function') {
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
  const maybeGetter = (player as {getCurrentTime?: () => number})
    .getCurrentTime;
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
  const maybeGetter = (player as {getPlayerState?: () => number})
    .getPlayerState;
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

export default function HomePage() {
  const apiReady = useYouTubeIframeApi();

  const hotkeyFocusRef = useRef<HTMLButtonElement>(null);
  const focusRecoveryTimersRef = useRef<number[]>([]);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const playbackRateRef = useRef<number>(1);

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('ko');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [loadedStorageForVideo, setLoadedStorageForVideo] =
    useState<boolean>(false);

  const canEnableLoop = useMemo(
    () => loopStart !== null && loopEnd !== null && loopEnd > loopStart,
    [loopStart, loopEnd],
  );
  const text = UI_TEXT[locale];

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
    setLoopStart(Math.floor(nextStart));
  }, [currentTime]);

  const setLoopEndFromCurrent = useCallback(() => {
    const liveTime = getCurrentTimeSafely(playerRef.current);
    const nextEnd = liveTime ?? currentTime;
    setLoopEnd(Math.floor(nextEnd));
  }, [currentTime]);

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
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [loopEnabled, loopStart, loopEnd, canEnableLoop]);

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

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    setLoopStartFromCurrent,
    setLoopEndFromCurrent,
    toggleLoop,
    togglePlayPause,
  ]);

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

          <LoopControls
            start={loopStart}
            end={loopEnd}
            enabled={loopEnabled}
            onStartValueChange={value => {
              if (value.trim() === '') {
                setLoopStart(null);
                return;
              }
              const parsed = parseTimeInputToSeconds(value);
              if (parsed !== null) {
                setLoopStart(parsed);
              }
            }}
            onEndValueChange={value => {
              if (value.trim() === '') {
                setLoopEnd(null);
                return;
              }
              const parsed = parseTimeInputToSeconds(value);
              if (parsed !== null) {
                setLoopEnd(parsed);
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

          {/* <KeyboardShortcuts
            title={text.shortcuts.title}
            setStartLabel={text.shortcuts.setStart}
            setEndLabel={text.shortcuts.setEnd}
            toggleLoopLabel={text.shortcuts.toggleLoop}
            playPauseLabel={text.shortcuts.playPause}
          /> */}
        </section>

        {/* <section className="panel">
          <h2 className="panel-title">{text.transport.title}</h2>
          <button type="button" className="primary-button" onClick={togglePlayPause}>
            {isPlaying ? text.transport.pause : text.transport.play}
          </button>
          {notice && <p className="notice-text">{notice}</p>}
        </section> */}
      </div>
    </main>
  );
}
