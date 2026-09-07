"use client";

export type PromptSide = "picture" | "name";

export function PromptToggle({
  value,
  onChange,
}: {
  value: PromptSide;
  onChange: (value: PromptSide) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Show first on the next card"
      className="prompt-toggle"
    >
      <span
        className={`prompt-toggle-thumb ${value === "name" ? "is-name" : "is-picture"}`}
        aria-hidden
      />
      <button
        type="button"
        role="radio"
        aria-checked={value === "picture"}
        className={value === "picture" ? "is-active" : ""}
        onClick={() => onChange("picture")}
      >
        Picture
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "name"}
        className={value === "name" ? "is-active" : ""}
        onClick={() => onChange("name")}
      >
        Name
      </button>
    </div>
  );
}
