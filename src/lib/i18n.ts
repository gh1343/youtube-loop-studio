export type Locale = "en" | "ko";

export const LOCALE_STORAGE_KEY = "youtube-practice-locale";

type UiText = {
  page: {
    title: string;
    subtitle: string;
    languageSwitcherLabel: string;
    languageEnglish: string;
    languageKorean: string;
  };
  video: {
    title: string;
    placeholder: string;
    inputAriaLabel: string;
    load: string;
    invalidUrl: string;
  };
  player: {
    title: string;
    placeholder: string;
  };
  timeline: {
    title: string;
    playing: string;
    paused: string;
  };
  speed: {
    title: string;
    label: string;
  };
  loop: {
    title: string;
    startLabel: string;
    endLabel: string;
    setCurrentStart: string;
    setCurrentEnd: string;
    rangeLabel: string;
    rangeSeparator: string;
    enable: string;
    disable: string;
    invalidRange: string;
  };
  shortcuts: {
    title: string;
    setStart: string;
    setEnd: string;
    toggleLoop: string;
    playPause: string;
  };
  transport: {
    title: string;
    play: string;
    pause: string;
  };
};

export const UI_TEXT: Record<Locale, UiText> = {
  en: {
    page: {
      title: "YouTube Loop Studio",
      subtitle: "Set loop points, slow down playback, and practice exact sections repeatedly.",
      languageSwitcherLabel: "Language",
      languageEnglish: "English",
      languageKorean: "Korean",
    },
    video: {
      title: "Video",
      placeholder: "Paste YouTube URL or video id",
      inputAriaLabel: "YouTube URL input",
      load: "Load",
      invalidUrl: "Could not parse a valid YouTube URL/video id.",
    },
    player: {
      title: "Player",
      placeholder: "Enter a YouTube link above, then press Load.",
    },
    timeline: {
      title: "Timeline",
      playing: "Playing",
      paused: "Paused",
    },
    speed: {
      title: "Speed",
      label: "Playback speed",
    },
    loop: {
      title: "A-B Loop",
      startLabel: "Start (A)",
      endLabel: "End (B)",
      setCurrentStart: "Set current (S)",
      setCurrentEnd: "Set current (E)",
      rangeLabel: "Range",
      rangeSeparator: "to",
      enable: "Enable Loop (R)",
      disable: "Disable Loop (R)",
      invalidRange: "Set a valid A-B range first (end must be after start).",
    },
    shortcuts: {
      title: "Shortcuts",
      setStart: "Set loop start",
      setEnd: "Set loop end",
      toggleLoop: "Toggle A-B loop",
      playPause: "Play / Pause",
    },
    transport: {
      title: "Transport",
      play: "Play (Space)",
      pause: "Pause (Space)",
    },
  },
  ko: {
    page: {
      title: "유튜브 루프 스튜디오",
      subtitle: "구간 반복과 배속 조절로 원하는 부분을 정확하게 연습하세요.",
      languageSwitcherLabel: "언어",
      languageEnglish: "영어",
      languageKorean: "한국어",
    },
    video: {
      title: "영상",
      placeholder: "유튜브 URL 또는 영상 ID를 입력하세요",
      inputAriaLabel: "유튜브 URL 입력",
      load: "불러오기",
      invalidUrl: "유효한 유튜브 URL 또는 영상 ID를 인식할 수 없습니다.",
    },
    player: {
      title: "플레이어",
      placeholder: "위에서 유튜브 링크를 입력한 뒤 불러오기를 눌러주세요.",
    },
    timeline: {
      title: "타임라인",
      playing: "재생 중",
      paused: "일시정지",
    },
    speed: {
      title: "속도",
      label: "재생 속도",
    },
    loop: {
      title: "A-B 반복",
      startLabel: "시작 (A)",
      endLabel: "끝 (B)",
      setCurrentStart: "현재 시점으로 설정 (S)",
      setCurrentEnd: "현재 시점으로 설정 (E)",
      rangeLabel: "구간",
      rangeSeparator: "~",
      enable: "반복 켜기 (R)",
      disable: "반복 끄기 (R)",
      invalidRange: "유효한 A-B 구간을 먼저 설정하세요. (끝은 시작보다 커야 합니다.)",
    },
    shortcuts: {
      title: "단축키",
      setStart: "반복 시작 설정",
      setEnd: "반복 끝 설정",
      toggleLoop: "A-B 반복 켜기/끄기",
      playPause: "재생 / 일시정지",
    },
    transport: {
      title: "재생 제어",
      play: "재생 (Space)",
      pause: "일시정지 (Space)",
    },
  },
};
