"use client";

import { useState } from "react";

type PaymentProofPreviewProps = {
  href: string;
  mimeType: string;
  alt: string;
  className?: string;
  heightClassName?: string;
};

export function PaymentProofPreview({
  href,
  mimeType,
  alt,
  className = "mt-4",
  heightClassName = "max-h-[24rem]",
}: PaymentProofPreviewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImagePreview = mimeType.startsWith("image/");
  const showPdfPreview = mimeType === "application/pdf" || mimeType.endsWith("/pdf");

  if (showImagePreview && !imageFailed) {
    return (
      <div className={`${className} overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-300)] bg-[#fffaf7]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={href}
          alt={alt}
          className={`block w-full object-contain ${heightClassName}`}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  if (showPdfPreview) {
    return (
      <div className={`${className} overflow-hidden rounded-[1.5rem] border border-[color:var(--paper-300)] bg-white`}>
        <object data={href} type={mimeType} className={`w-full ${heightClassName.replace("max-h", "h")}`}>
          <p className="p-4 text-sm text-[color:var(--ink-700)]">
            Preview PDF belum tersedia di browser ini.
          </p>
        </object>
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-[1.5rem] border border-dashed border-[color:var(--paper-300)] bg-[color:var(--paper-100)] p-4 text-sm leading-7 text-[color:var(--ink-700)]`}
    >
      Preview file belum tersedia di browser ini, tapi file tetap bisa di-download dengan aman.
    </div>
  );
}
