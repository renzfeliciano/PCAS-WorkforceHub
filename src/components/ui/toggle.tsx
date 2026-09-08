type ToggleProps = Readonly<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  name?: string;
  fullWidth?: boolean;
  testId?: string;
}>;

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
  name,
  fullWidth,
  testId,
}: ToggleProps) {
  return (
    <div className="toggle-field" style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label>
        <input
          type="checkbox"
          className="toggle-input"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          data-testid={testId ?? (name ? `toggle-${name}` : undefined)}
        />
        {label}
      </label>
      {hint && <small>{hint}</small>}
    </div>
  );
}
