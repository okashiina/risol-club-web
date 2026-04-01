"use client";

import { useFormStatus } from "react-dom";

type ActionButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function ActionButton({ children, className }: ActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}
