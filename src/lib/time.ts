export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function parseTimeInputToSeconds(input: string): number | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  if (value.includes(":")) {
    const parts = value.split(":").map((part) => part.trim());
    if (parts.some((part) => part.length === 0 || !/^\d+$/.test(part))) {
      return null;
    }

    const numeric = parts.map((part) => Number(part));
    if (numeric.some((part) => !Number.isFinite(part) || part < 0)) {
      return null;
    }

    if (numeric.length === 2) {
      const [minutes, seconds] = numeric;
      if (seconds >= 60) {
        return null;
      }
      return minutes * 60 + seconds;
    }

    if (numeric.length === 3) {
      const [hours, minutes, seconds] = numeric;
      if (minutes >= 60 || seconds >= 60) {
        return null;
      }
      return hours * 3600 + minutes * 60 + seconds;
    }

    return null;
  }

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber < 0) {
    return null;
  }

  return Math.floor(asNumber);
}
