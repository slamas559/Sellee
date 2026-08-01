"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
};

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}