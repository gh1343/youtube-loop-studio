import { useEffect, useState } from "react";
import { formatTime } from "@/lib/time";

type LoopControlsProps = {
  start: number | null;
  end: number | null;
  enabled: boolean;
  onStartValueChange: (value: string) => void;
  onEndValueChange: (value: string) => void;
  onSetStartFromCurrent: () => void;
  onSetEndFromCurrent: () => void;
  onToggleLoop: () => void;
  title: string;
  startLabel: string;
  endLabel: string;
  setCurrentStartLabel: string;
  setCurrentEndLabel: string;
  rangeLabel: string;
  rangeSeparator: string;
  enableLabel: string;
  disableLabel: string;
};

export function LoopControls({
  start,
  end,
  enabled,
  onStartValueChange,
  onEndValueChange,
  onSetStartFromCurrent,
  onSetEndFromCurrent,
  onToggleLoop,
  title,
  startLabel,
  endLabel,
  setCurrentStartLabel,
  setCurrentEndLabel,
  rangeLabel,
  rangeSeparator,
  enableLabel,
  disableLabel,
}: LoopControlsProps) {
  const [startInput, setStartInput] = useState<string>(start === null ? "" : formatTime(start));
  const [endInput, setEndInput] = useState<string>(end === null ? "" : formatTime(end));

  useEffect(() => {
    setStartInput(start === null ? "" : formatTime(start));
  }, [start]);

  useEffect(() => {
    setEndInput(end === null ? "" : formatTime(end));
  }, [end]);

  return (
    <section className="panel loop-panel">
      <h2 className="panel-title">{title}</h2>
      <div className="loop-grid">
        <label className="field-label" htmlFor="start-time">
          {startLabel}
        </label>
        <input
          id="start-time"
          className="number-input"
          type="text"
          inputMode="numeric"
          placeholder="00:00"
          value={startInput}
          onChange={(event) => setStartInput(event.target.value)}
          onBlur={() => onStartValueChange(startInput)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onStartValueChange(startInput);
            }
          }}
        />
        <button type="button" className="secondary-button" onClick={onSetStartFromCurrent}>
          {setCurrentStartLabel}
        </button>

        <label className="field-label" htmlFor="end-time">
          {endLabel}
        </label>
        <input
          id="end-time"
          className="number-input"
          type="text"
          inputMode="numeric"
          placeholder="00:00"
          value={endInput}
          onChange={(event) => setEndInput(event.target.value)}
          onBlur={() => onEndValueChange(endInput)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onEndValueChange(endInput);
            }
          }}
        />
        <button type="button" className="secondary-button" onClick={onSetEndFromCurrent}>
          {setCurrentEndLabel}
        </button>
      </div>
      <div className="loop-footer">
        <p className={`loop-label ${enabled ? "loop-label-active" : ""}`}>
          {rangeLabel}: {start === null ? "--:--" : formatTime(start)} {rangeSeparator}{" "}
          {end === null ? "--:--" : formatTime(end)}
        </p>
        <button
          type="button"
          className={`${enabled ? "danger-button" : "primary-button"} loop-toggle-button`}
          onClick={onToggleLoop}
        >
          {enabled ? disableLabel : enableLabel}
        </button>
      </div>
    </section>
  );
}
