import { useState, type KeyboardEvent } from "react";

// Free-text tag chips: type + Enter (or comma) to add, ×  to remove.
// Lowercased, de-duped, capped at `max`.
export function TagInput({
  value,
  onChange,
  max = 30,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim().toLowerCase();
    setDraft("");
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="cb-taginput">
      {value.length > 0 ? (
        <div className="cb-chips">
          {value.map((tag) => (
            <span className="cb-chip" key={tag}>
              {tag}
              <button
                type="button"
                className="cb-chip-x"
                aria-label={`Bỏ thẻ ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        className="cb-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={value.length >= max ? `Tối đa ${max} thẻ` : "Nhập thẻ rồi nhấn Enter"}
        disabled={value.length >= max}
      />
    </div>
  );
}
