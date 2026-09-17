"use client";

import { XIcon } from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
  id?: string;
  removeLabel: string;
  "aria-invalid"?: boolean;
};

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  max = 20,
  id,
  removeLabel,
  ...rest
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const normalized = new Set(value.map((v) => v.toLowerCase()));
  const filtered = suggestions
    .filter(
      (s) =>
        !normalized.has(s.toLowerCase()) &&
        (!draft || s.toLowerCase().includes(draft.toLowerCase())),
    )
    .slice(0, 8);

  function add(raw: string) {
    const tag = raw.trim().replace(/,+$/, "");
    if (!tag || normalized.has(tag.toLowerCase()) || value.length >= max) return;
    onChange([...value, tag]);
    setDraft("");
  }

  return (
    <div className="grid gap-2">
      <Input
        id={id}
        list={listId}
        value={draft}
        placeholder={placeholder}
        aria-invalid={rest["aria-invalid"]}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
      />
      <datalist id={listId}>
        {filtered.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== tag))}
                  className="hover:bg-navy/10 rounded-full p-0.5"
                  aria-label={`${removeLabel} ${tag}`}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
