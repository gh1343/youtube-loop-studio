import {useId, useMemo, useState} from 'react';

type TagInputProps = {
  label: string;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  tags: string[];
  suggestions: string[];
  onChange: (nextTags: string[]) => void;
};

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

export function TagInput({
  label,
  placeholder,
  addLabel,
  removeLabel,
  tags,
  suggestions,
  onChange,
}: TagInputProps) {
  const inputId = useId();
  const [inputValue, setInputValue] = useState<string>('');

  const filteredSuggestions = useMemo(() => {
    const normalizedInput = normalizeTag(inputValue);
    if (!normalizedInput) {
      return suggestions.filter(tag => !tags.includes(tag)).slice(0, 8);
    }
    return suggestions
      .filter(tag => !tags.includes(tag))
      .filter(tag => tag.includes(normalizedInput))
      .slice(0, 8);
  }, [inputValue, suggestions, tags]);

  const addTag = (raw: string) => {
    const normalized = normalizeTag(raw);
    if (!normalized || tags.includes(normalized)) {
      setInputValue('');
      return;
    }
    onChange([...tags, normalized]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="tag-input">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>

      <div className="tag-editor">
        <input
          id={inputId}
          className="number-input"
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={event => setInputValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addTag(inputValue);
            }
          }}
        />
        <button
          type="button"
          className="secondary-button tag-add-button"
          onClick={() => addTag(inputValue)}
        >
          {addLabel}
        </button>
      </div>

      {filteredSuggestions.length > 0 && (
        <div className="tag-suggestions">
          {filteredSuggestions.map(tag => (
            <button
              key={tag}
              type="button"
              className="tag-button tag-suggestion-button"
              onClick={() => addTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div className="tag-list">
        {tags.map(tag => (
          <button
            key={tag}
            type="button"
            className="tag-button"
            onClick={() => removeTag(tag)}
            aria-label={`${removeLabel}: ${tag}`}
          >
            #{tag} ×
          </button>
        ))}
      </div>
    </div>
  );
}
