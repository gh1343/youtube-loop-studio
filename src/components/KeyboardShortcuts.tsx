type KeyboardShortcutsProps = {
  title: string;
  setStartLabel: string;
  setEndLabel: string;
  toggleLoopLabel: string;
  playPauseLabel: string;
};

export function KeyboardShortcuts({
  title,
  setStartLabel,
  setEndLabel,
  toggleLoopLabel,
  playPauseLabel,
}: KeyboardShortcutsProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      <ul className="shortcuts-list">
        <li>
          <kbd>S</kbd> {setStartLabel}
        </li>
        <li>
          <kbd>E</kbd> {setEndLabel}
        </li>
        <li>
          <kbd>R</kbd> {toggleLoopLabel}
        </li>
        <li>
          <kbd>Space</kbd> {playPauseLabel}
        </li>
      </ul>
    </section>
  );
}
