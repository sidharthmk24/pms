"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  searchPlaces,
  POPULAR_KERALA_DISTRICTS,
  type PlaceResult,
} from "@/lib/places";

export interface PlaceSelectProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
}

export function PlaceSelect({
  id = "place-select",
  name = "place",
  label = "Place / City / District",
  value: controlledValue,
  defaultValue = "",
  onChange,
  placeholder = "e.g. Kozhikode, Thrissur, Ernakulam",
  required = false,
  disabled = false,
  error,
  hint,
  className = "",
}: PlaceSelectProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const inputValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Real-time search suggestions based on current input
  const suggestions: PlaceResult[] = useMemo(() => {
    const q = inputValue.trim();
    if (!q || q.length < 1) return [];
    return searchPlaces(q, 15);
  }, [inputValue]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!isControlled) {
      setInternalValue(val);
    }
    onChange?.(val);
    setIsOpen(true);
  }

  function handleSelectSuggestion(formatted: string) {
    if (!isControlled) {
      setInternalValue(formatted);
    }
    onChange?.(formatted);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleClear() {
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
    inputRef.current?.focus();
    setIsOpen(true);
  }

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={id}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground select-none"
          >
            <span>{label}</span>
            {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
          </label>
        </div>
      )}

      {/* Main Search Input */}
      <div className="relative">
        <div className="relative flex h-[44px] w-full items-center">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            autoComplete="off"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              setIsFocused(true);
              setIsOpen(true);
            }}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`h-full w-full rounded-xl border border-gray-200 bg-white pl-3.5 pr-8 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-[#7e2562] focus:ring-2 focus:ring-[#7e2562]/20 shadow-xs ${
              disabled ? "bg-gray-50 opacity-60 cursor-not-allowed" : ""
            }`}
          />

          {inputValue && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              title="Clear"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <div className="absolute right-3 text-gray-400 pointer-events-none">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>

        {/* Real-time Floating Dropdown */}
        {isOpen && isFocused && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 max-h-56 overflow-y-auto custom-scrollbar">
            {inputValue.trim().length >= 1 ? (
              suggestions.length > 0 ? (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Matching Places
                  </div>
                  {suggestions.map((item, index) => (
                    <button
                      key={`${item.formatted}-${index}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        handleSelectSuggestion(item.formatted);
                      }}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[#7e2562]/10 hover:text-[#7e2562] text-gray-800 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold group-hover:text-[#7e2562] text-foreground">
                          {item.city || item.state}
                        </span>
                        <span className="text-gray-400 text-[11px] truncate">
                          {item.city ? `${item.state}, ${item.country}` : item.country}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  <p>No verified place matching &ldquo;{inputValue}&rdquo;</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Your custom typed place will be saved as entered.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Popular Districts &amp; Towns
                </div>
                {POPULAR_KERALA_DISTRICTS.slice(0, 8).map((district) => (
                  <button
                    key={district}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(district);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[#7e2562]/10 hover:text-[#7e2562] text-gray-800 cursor-pointer"
                  >
                    <span className="font-semibold">{district}</span>
                    <span className="text-[10px] text-muted-foreground">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {hint && !error && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-600 animate-in fade-in mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
}
