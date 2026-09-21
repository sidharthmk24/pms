"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ALL_COUNTRIES,
  PRIORITY_COUNTRIES,
  type CountryInfo,
  validatePhoneNumber,
  parseAndFormatE164,
} from "@/lib/phone";
import type { CountryCode } from "libphonenumber-js";

export interface PhoneInputProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, isValid: boolean, country: CountryCode) => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  isWhatsApp?: boolean;
  showValidationBadge?: boolean;
}

export function PhoneInput({
  id = "phone-input",
  name = "phone",
  label,
  value: controlledValue,
  defaultValue = "",
  onChange,
  defaultCountry = "IN",
  placeholder = "+91 98765 43210",
  required = false,
  disabled = false,
  error,
  hint,
  className = "",
  isWhatsApp = false,
  showValidationBadge = true,
}: PhoneInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const inputValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(defaultCountry);

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

  // Real-time phone validity
  const isValid = useMemo(() => {
    if (!inputValue || !inputValue.trim()) return false;
    return validatePhoneNumber(inputValue, selectedCountryCode);
  }, [inputValue, selectedCountryCode]);

  // Real-time country suggestions based on typed input
  const suggestions = useMemo(() => {
    const raw = inputValue.trim().toLowerCase();
    if (!raw) {
      // Default to popular diaspora countries when input is empty
      return PRIORITY_COUNTRIES.map((code) => ALL_COUNTRIES.find((c) => c.code === code)).filter(
        Boolean
      ) as CountryInfo[];
    }

    const digitsOnly = raw.replace(/\D/g, "");

    return ALL_COUNTRIES.filter((c) => {
      const dialDigits = c.dialCode.replace(/\D/g, "");
      const nameMatch = c.name.toLowerCase().includes(raw);
      const dialMatch = c.dialCode.toLowerCase().includes(raw);
      const digitsMatch = digitsOnly.length > 0 && (dialDigits.startsWith(digitsOnly) || dialDigits.includes(digitsOnly));
      return nameMatch || dialMatch || digitsMatch;
    }).sort((a, b) => {
      if (digitsOnly.length > 0) {
        const aDial = a.dialCode.replace(/\D/g, "");
        const bDial = b.dialCode.replace(/\D/g, "");
        if (aDial === digitsOnly && bDial !== digitsOnly) return -1;
        if (bDial === digitsOnly && aDial !== digitsOnly) return 1;
        if (aDial.startsWith(digitsOnly) && !bDial.startsWith(digitsOnly)) return -1;
        if (bDial.startsWith(digitsOnly) && !aDial.startsWith(digitsOnly)) return 1;
      }
      return 0;
    }).slice(0, 10);
  }, [inputValue]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!isControlled) {
      setInternalValue(val);
    }

    // Auto-detect country code from input
    if (val.startsWith("+") || val.startsWith("00")) {
      const cleanPrefix = val.startsWith("+") ? val : "+" + val.slice(2);
      const match = ALL_COUNTRIES.find((c) => cleanPrefix.startsWith(c.dialCode));
      if (match) {
        setSelectedCountryCode(match.code);
      }
    }

    const valid = validatePhoneNumber(val, selectedCountryCode);
    onChange?.(val, valid, selectedCountryCode);
    setIsOpen(true);
  }

  function handleSelectCountry(country: CountryInfo) {
    setSelectedCountryCode(country.code);

    // Extract any existing local subscriber digits
    const existingDigits = inputValue.replace(/\D/g, "");
    const countryDialDigits = country.dialCode.replace(/\D/g, "");

    let localDigits = existingDigits;
    if (existingDigits.startsWith(countryDialDigits)) {
      localDigits = existingDigits.slice(countryDialDigits.length);
    }

    const newValue = localDigits ? `${country.dialCode} ${localDigits}` : `${country.dialCode} `;

    if (!isControlled) {
      setInternalValue(newValue);
    }
    const valid = validatePhoneNumber(newValue, country.code);
    onChange?.(newValue, valid, country.code);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleClear() {
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("", false, selectedCountryCode);
    inputRef.current?.focus();
    setIsOpen(true);
  }

  const fullE164 = useMemo(() => {
    if (!inputValue) return "";
    return parseAndFormatE164(inputValue, selectedCountryCode);
  }, [inputValue, selectedCountryCode]);

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor={id}
            className="inline-flex items-center gap-1 text-xs font-bold   tracking-wider text-foreground select-none"
          >
           
            <span>{label}</span>
            {required && <span className="text-rose-600 font-bold ml-0.5">*</span>}
          </label>

          {showValidationBadge && inputValue && (
            <span
              className={`text-[10px] font-semibold flex items-center gap-1 transition-all ${
                isValid ? "text-emerald-700 font-bold" : "text-muted-foreground"
              }`}
            >
              {isValid ? (
                <>
                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Valid
                </>
              ) : null}
            </span>
          )}
        </div>
      )}

      {/* Hidden input for backend form submission with full E.164 number */}
      <input type="hidden" name={name} value={fullE164 || inputValue} />

      {/* Main Single Input Box */}
      <div className="relative">
        <div className="relative flex h-[44px] w-full items-center">
          <input
            ref={inputRef}
            id={id}
            type="tel"
            autoComplete="tel"
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

        {/* Real-time Country Code Suggestions Floating Dropdown */}
        {isOpen && isFocused && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 max-h-56 overflow-y-auto custom-scrollbar">
            <div className="px-2 py-1 text-[10px] font-bold   tracking-wider text-muted-foreground">
              {inputValue.trim() ? "Suggested Country Codes" : "Popular Country Codes"}
            </div>

            {suggestions.length === 0 ? (
              <div className="py-3 text-center text-xs text-muted-foreground">
                No matching country code for &ldquo;{inputValue}&rdquo;
              </div>
            ) : (
              suggestions.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSelectCountry(c);
                  }}
                  className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[#7e2562]/10 hover:text-[#7e2562] text-gray-800 cursor-pointer group"
                >
                  <span className="font-semibold text-foreground group-hover:text-[#7e2562] truncate pr-2">
                    {c.name}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-gray-600 shrink-0">
                    {c.dialCode}
                  </span>
                </button>
              ))
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
