"use client";

import { useState, type FormEvent } from "react";

type ValidatableElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isValidatable(element: Element): element is ValidatableElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

/**
 * Replaces the browser's native "Please fill out this field" validation bubbles
 * with inline, ARIA-wired error messages, while still reusing the browser's own
 * constraint-validation engine (required/type/pattern/minLength/etc. declared as
 * HTML attributes). Pair with <form noValidate> so the native UI never appears.
 */
export function useInlineFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(form: HTMLFormElement): boolean {
    const nextErrors: Record<string, string> = {};
    for (const element of Array.from(form.elements)) {
      if (!isValidatable(element) || !element.name) continue;
      if (!element.checkValidity()) nextErrors[element.name] = element.validationMessage;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function clearError(name: string) {
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function reset() {
    setErrors({});
  }

  /**
   * Attach to a <form onChange>: as soon as a field carries a value, its
   * inline error clears immediately rather than waiting for the next submit.
   * An error only reappears if validation fails again.
   */
  function handleChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target as Element;
    if (!isValidatable(target) || !target.name) return;
    if (target.value.trim()) clearError(target.name);
  }

  return {
    errors,
    validate,
    clearError,
    reset,
    handleChange,
    fieldError: (name: string) => errors[name],
  };
}
