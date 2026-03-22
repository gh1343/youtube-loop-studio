type VideoUrlInputProps = {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
  errorMessage: string | null;
  title: string;
  placeholder: string;
  inputAriaLabel: string;
  loadLabel: string;
};

export function VideoUrlInput({
  value,
  onChange,
  onSubmit,
  errorMessage,
  title,
  placeholder,
  inputAriaLabel,
  loadLabel,
}: VideoUrlInputProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      <div className="url-input-row">
        <input
          className="url-input"
          data-shortcut-scope="global"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
        />
        <button type="button" className="primary-button load-button" onClick={onSubmit}>
          {loadLabel}
        </button>
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
    </section>
  );
}
