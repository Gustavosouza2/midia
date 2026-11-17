"use client";

import { useState, type KeyboardEvent } from "react";

/**
 * Props for an input that edits a saved value in place: typing keeps a draft, blur commits it (Enter blurs,
 * so there is one commit path), Esc reverts. `commit` gets the draft only when it differs from `value`;
 * the draft is dropped after it settles either way, so the input shows whatever was saved.
 */
export function useInlineEdit(value: string, commit: (text: string) => Promise<void>) {
  const [draft, setDraft] = useState<string | null>(null);

  async function save() {
    if (draft === null) return;
    if (draft.trim() !== value) await commit(draft);
    setDraft(null);
  }

  return {
    value: draft ?? value,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onBlur: () => void save(),
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setDraft(null);
      }
    },
  };
}
