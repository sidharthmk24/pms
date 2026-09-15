"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";

export type DropdownOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
};

export type DropdownProps = {
  options: DropdownOption[];
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
};

export function SmoothDropdown({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Select an option…",
  name,
  id,
  disabled = false,
  required = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  optionClassName = "",
  align = "left",
  size = "md",
  ariaLabel,
}: DropdownProps) {
  const generatedId = useId();
  const dropdownId = id || generatedId;

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string | number>(
    controlledValue !== undefined
      ? controlledValue
      : defaultValue !== undefined
      ? defaultValue
      : ""
  );

  const selectedValue = isControlled ? controlledValue : internalValue;
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    width: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync internal state when controlled value changes
  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue, isControlled]);

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(selectedValue)
  );

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(options.length * 44 + 24, 280);
    const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    if (openUpward) {
      setMenuCoords({
        bottom: window.innerHeight - rect.top + 6,
        left: align === "right" ? undefined : Math.max(8, rect.left),
        right: align === "right" ? Math.max(8, window.innerWidth - rect.right) : undefined,
        width: rect.width,
      });
    } else {
      setMenuCoords({
        top: rect.bottom + 6,
        left: align === "right" ? undefined : Math.max(8, rect.left),
        right: align === "right" ? Math.max(8, window.innerWidth - rect.right) : undefined,
        width: rect.width,
      });
    }
  }, [align, options.length]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listboxRef.current &&
        !listboxRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (optionValue: string | number) => {
      if (disabled) return;
      const strVal = String(optionValue);
      if (!isControlled) {
        setInternalValue(optionValue);
      }
      onChange?.(strVal);
      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [disabled, isControlled, onChange]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
        return;
      }

      const availableOptions = options.filter((o) => !o.disabled);
      if (availableOptions.length === 0) return;

      let nextIndex = focusedIndex;
      if (e.key === "ArrowDown") {
        nextIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0;
      } else {
        nextIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
      }
      setFocusedIndex(nextIndex);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && focusedIndex < options.length) {
        const opt = options[focusedIndex];
        if (!opt.disabled) {
          handleSelect(opt.value);
        }
      } else {
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (isOpen) {
        setIsOpen(false);
        if (e.key === "Escape") {
          e.preventDefault();
          buttonRef.current?.focus();
        }
      }
    }
  };

  // Sizing variants
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-3.5 py-2.5 text-sm rounded-xl",
    lg: "px-4 py-3 text-base rounded-xl font-semibold",
  }[size];

  const arrowSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4.5 w-4.5",
  }[size];

  const isSelected =
    selectedValue !== undefined &&
    selectedValue !== null &&
    String(selectedValue) !== "" &&
    String(selectedValue) !== "all" &&
    String(selectedValue) !== "ALL";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for standard form POST/GET support */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedValue !== undefined && selectedValue !== null ? String(selectedValue) : ""}
          required={required}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        id={dropdownId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`apple-button group flex w-full items-center justify-between gap-2.5 border transition-all duration-200 outline-none select-none text-left
          ${sizeClasses}
          ${
            disabled
              ? "opacity-50 cursor-not-allowed border-black/10 bg-black/[0.02] text-muted-foreground dark:border-white/10 dark:bg-white/[0.02]"
              : isOpen
              ? isSelected
                ? "border-[#7e2562] ring-2 ring-[#7e2562]/30 shadow-plum-sm bg-[#faedf5]/60 text-black dark:text-white"
                : "border-foreground bg-surface shadow-xs text-foreground ring-2 ring-foreground/10 dark:border-foreground dark:ring-foreground/20"
              : isSelected
              ? "border-[#7e2562] ring-2 ring-[#7e2562]/30 shadow-plum-sm font-bold bg-[#faedf5]/40 text-black dark:text-white"
              : "border-black/12 bg-surface hover:border-black/25 text-foreground hover:bg-black/[0.01] dark:border-white/15 dark:bg-surface-muted/60 dark:hover:border-white/30 dark:hover:bg-white/[0.02]"
          }
          ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              !selectedOption || selectedOption.value === "" || selectedOption.value === "all" || selectedOption.value === "ALL"
                ? "text-muted-foreground/70 font-normal"
                : isSelected
                ? "font-bold text-black dark:text-white"
                : "font-semibold text-foreground"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <svg
          className={`shrink-0 transition-transform duration-200 ease-out ${arrowSizes} ${
            isSelected ? "text-[#7e2562]" : "text-muted-foreground"
          } ${
            isOpen ? "rotate-180 text-foreground" : "group-hover:text-foreground"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Top-Z-Indexed Floating Dropdown Menu Popover via Portal */}
      {isOpen &&
        mounted &&
        menuCoords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              zIndex: 999999,
              top: menuCoords.top !== undefined ? `${menuCoords.top}px` : "auto",
              bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : "auto",
              left: menuCoords.left !== undefined ? `${menuCoords.left}px` : "auto",
              right: menuCoords.right !== undefined ? `${menuCoords.right}px` : "auto",
              minWidth: `${Math.max(menuCoords.width, 170)}px`,
              maxWidth: "min(360px, calc(100vw - 24px))",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            <ul
              ref={listboxRef}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={dropdownId}
              className={`max-h-64 overflow-y-auto rounded-2xl border border-black/10 bg-surface/95 p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 dark:border-white/15 dark:bg-surface-muted/95 dark:ring-white/10 ${menuClassName}`}
            >
              {options.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground text-center">
                  No options available
                </li>
              ) : (
                options.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(selectedValue);
                  const isFocused = focusedIndex === idx;

                  return (
                    <li
                      key={String(opt.value) + idx}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      onMouseEnter={() => !opt.disabled && setFocusedIndex(idx)}
                      className={`group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all duration-150 select-none
                        ${
                          opt.disabled
                            ? "opacity-40 cursor-not-allowed"
                            : isSelected
                            ? "bg-foreground text-background font-bold shadow-2xs dark:bg-foreground dark:text-background"
                            : isFocused
                            ? "bg-black/[0.05] text-foreground dark:bg-white/[0.08]"
                            : "text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        }
                        ${optionClassName}`}
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <div className="flex flex-col truncate">
                          <span className="truncate">{opt.label}</span>
                          {opt.description && (
                            <span
                              className={`text-[10px] truncate ${
                                isSelected
                                  ? "text-background/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <svg
                          className="h-3.5 w-3.5 shrink-0 opacity-90"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

export const Dropdown = SmoothDropdown;
export default SmoothDropdown;

export type MultiSelectProps = {
  options: DropdownOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
};

export function MultiSelectDropdown({
  options,
  values,
  onChange,
  placeholder = "Select assignees…",
  disabled = false,
  className = "",
  size = "sm",
  ariaLabel = "Select assignees",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = 280;
    const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    if (openUpward) {
      setMenuCoords({
        bottom: window.innerHeight - rect.top + 6,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width, 240),
      });
    } else {
      setMenuCoords({
        top: rect.bottom + 6,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width, 240),
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handler = () => updatePosition();
      window.addEventListener("scroll", handler, true);
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("scroll", handler, true);
        window.removeEventListener("resize", handler);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listboxRef.current &&
        !listboxRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  function toggleOption(optVal: string) {
    if (values.includes(optVal)) {
      onChange(values.filter((v) => v !== optVal));
    } else {
      onChange([...values, optVal]);
    }
  }

  function removeValue(e: React.MouseEvent, optVal: string) {
    e.stopPropagation();
    onChange(values.filter((v) => v !== optVal));
  }

  const filteredOptions = options.filter(
    (opt) =>
      opt.value !== "" &&
      (opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(search.toLowerCase())))
  );

  const selectedOptions = options.filter((opt) => values.includes(String(opt.value)));

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        className={`group relative flex w-full items-center justify-between gap-2 rounded-xl border border-black/12 bg-surface text-left transition-all hover:border-black/20 focus:outline-hidden focus:ring-2 focus:ring-foreground/20 dark:border-white/15 dark:bg-surface-muted/60 dark:hover:border-white/30 ${
          size === "sm" ? "min-h-[38px] px-3 py-1.5 text-xs" : "min-h-[44px] px-3.5 py-2 text-sm"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-foreground/8 px-2 py-0.5 text-[11px] font-semibold text-foreground dark:border-white/10 dark:bg-white/10"
              >
                <span className="truncate max-w-[120px]">{opt.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => removeValue(e, String(opt.value))}
                  className="cursor-pointer text-muted-foreground hover:text-foreground font-black ml-0.5"
                >
                  ×
                </span>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {selectedOptions.length > 0 && (
            <span className="rounded-full bg-foreground/10 px-1.5 py-0.2 text-[10px] font-bold text-foreground">
              {selectedOptions.length}
            </span>
          )}
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180 text-foreground" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Floating Dropdown Menu */}
      {mounted &&
        isOpen &&
        menuCoords &&
        createPortal(
          <div
            ref={listboxRef}
            style={{
              position: "fixed",
              top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
              bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
              left: `${menuCoords.left}px`,
              width: `${menuCoords.width}px`,
              zIndex: 99999,
            }}
            className="overflow-hidden rounded-2xl border border-black/12 bg-surface shadow-2xl backdrop-blur-2xl dark:border-white/15 dark:bg-surface/95"
          >
            {/* Search filter if many options */}
            {options.length > 4 && (
              <div className="border-b border-black/8 p-2 dark:border-white/8">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter staff..."
                  className="w-full rounded-lg border border-black/10 bg-black/[0.02] px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>
            )}

            <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">No staff members found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = values.includes(String(opt.value));
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(String(opt.value))}
                      className={`flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? "bg-foreground/8 text-foreground font-bold dark:bg-white/10"
                          : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isChecked
                              ? "border-foreground bg-foreground text-background"
                              : "border-black/25 dark:border-white/30"
                          }`}
                        >
                          {isChecked && <span className="text-[10px] font-black">✓</span>}
                        </div>
                        <div className="truncate">
                          <p className="truncate text-xs font-semibold">{opt.label}</p>
                          {opt.description && (
                            <p className="truncate text-[10px] text-muted-foreground font-normal">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer action */}
            <div className="border-t border-black/8 p-2 flex items-center justify-between text-[11px] dark:border-white/8">
              {values.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-muted-foreground hover:text-danger font-semibold transition"
                >
                  Clear all
                </button>
              ) : (
                <span className="text-muted-foreground italic">None selected</span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-foreground px-3 py-1 font-bold text-background transition hover:bg-foreground/90"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
