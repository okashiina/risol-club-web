"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

type DangerSubmitButtonProps = {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
};

export function DangerSubmitButton({
  confirmMessage,
  className = "",
  children,
}: DangerSubmitButtonProps) {
  const { pending } = useFormStatus();
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input ref={hiddenInputRef} type="hidden" name="confirmation" value="" />
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(confirmMessage)) {
            event.preventDefault();
            return;
          }

          if (hiddenInputRef.current) {
            hiddenInputRef.current.value = "DELETE";
          }
        }}
        className={className}
      >
        {pending ? "Deleting..." : children}
      </button>
    </>
  );
}
