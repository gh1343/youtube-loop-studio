const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type SpeedControlProps = {
  value: number;
  onChange: (value: number) => void;
  title: string;
  label: string;
};

export function SpeedControl({ value, onChange, title, label }: SpeedControlProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      <label className="field-label" htmlFor="speed-select">
        {label}
      </label>
      <select
        id="speed-select"
        className="select-input"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {SPEED_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}x
          </option>
        ))}
      </select>
    </section>
  );
}
