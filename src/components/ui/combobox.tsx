import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  id?: string;
  query: string;
  onQueryChange: (query: string) => void;
  options: ComboboxOption[];
  onSelect: (option: ComboboxOption) => void;
  placeholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

export function Combobox({
  id,
  query,
  onQueryChange,
  options,
  onSelect,
  placeholder,
  emptyMessage = "No matches",
  isLoading = false,
  disabled = false,
  ...rest
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [options]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (option: ComboboxOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      if (isOpen && options[highlightedIndex]) {
        event.preventDefault();
        handleSelect(options[highlightedIndex]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
        className={cn(
          "flex h-10 w-full min-w-0 rounded-field border border-input bg-surface px-3.5 py-[9px] text-sm text-text transition-colors outline-none",
          "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        {...rest}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-field border border-border bg-surface py-1 shadow-lg">
          {isLoading && <div className="px-3.5 py-2 text-sm text-text-secondary">Searching…</div>}
          {!isLoading && options.length === 0 && (
            <div className="px-3.5 py-2 text-sm text-text-secondary">{emptyMessage}</div>
          )}
          {!isLoading &&
            options.map((option, index) => (
              <button
                key={option.value || "__empty__"}
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-3.5 py-2 text-left text-sm",
                  index === highlightedIndex ? "bg-bg" : "",
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
              >
                <span className="font-medium text-text">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-text-secondary">{option.description}</span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
