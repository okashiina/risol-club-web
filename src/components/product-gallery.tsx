"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/lib/types";

type ProductGalleryProps = {
  images: ProductImage[];
  name: string;
  priority?: boolean;
  aspectClassName?: string;
  className?: string;
  showThumbnails?: boolean;
};

export function ProductGallery({
  images,
  name,
  priority = false,
  aspectClassName = "aspect-[1.08/1]",
  className = "",
  showThumbnails = true,
}: ProductGalleryProps) {
  const [index, setIndex] = useState(0);
  const touchStartXRef = useRef(0);
  const total = Math.max(images.length, 1);
  const safeImages =
    images.length > 0
      ? images
      : [
          {
            id: `${name}-fallback`,
            url: "/brand/logo-white-bg.png",
            alt: `${name} placeholder`,
            position: 0,
          },
        ];

  function go(nextIndex: number) {
    setIndex((nextIndex + total) % total);
  }
  return (
    <div className={`grid gap-3 ${className}`}>
      <div
        className={`relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 shadow-[0_28px_60px_rgba(185,30,30,0.12)] ${aspectClassName}`}
        onTouchStart={(event) => {
          touchStartXRef.current = event.changedTouches[0]?.clientX ?? 0;
        }}
        onTouchEnd={(event) => {
          const touchEndX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
          const delta = touchEndX - touchStartXRef.current;

          if (Math.abs(delta) < 48) {
            return;
          }

          go(index + (delta < 0 ? 1 : -1));
        }}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {safeImages.map((image, imageIndex) => (
            <div key={image.id} className="relative h-full min-w-full">
              <Image
                src={image.url}
                alt={image.alt || `${name} photo ${imageIndex + 1}`}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
                priority={priority && imageIndex === 0}
              />
            </div>
          ))}
        </div>

        {safeImages.length > 1 ? (
          <>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-[color:var(--brand-900)] shadow-[0_12px_24px_rgba(185,30,30,0.16)] transition hover:scale-[1.03]"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-[color:var(--brand-900)] shadow-[0_12px_24px_rgba(185,30,30,0.16)] transition hover:scale-[1.03]"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(70,18,18,0.35)] via-transparent to-transparent px-4 pb-4 pt-12">
          <div className="flex items-center justify-between gap-4">
            <p className="font-heading text-lg text-white">{name}</p>
            <div className="flex items-center gap-2">
              {safeImages.map((image, imageIndex) => (
                <button
                  key={`${image.id}-dot`}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => go(imageIndex)}
                  className={`h-2.5 rounded-full transition-all ${
                    imageIndex === index ? "w-8 bg-white" : "w-2.5 bg-white/45"
                  }`}
                  aria-label={`Go to photo ${imageIndex + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showThumbnails && safeImages.length > 1 ? (
        <div className="grid grid-cols-3 gap-3">
          {safeImages.map((image, imageIndex) => (
            <button
              key={`${image.id}-thumb`}
              type="button"
              suppressHydrationWarning
              onClick={() => go(imageIndex)}
              className={`relative overflow-hidden rounded-[1.25rem] border transition ${
                imageIndex === index
                  ? "border-[color:var(--brand-900)] shadow-[0_18px_30px_rgba(185,30,30,0.12)]"
                  : "border-[rgba(185,30,30,0.12)]"
              }`}
            >
              <div className="relative aspect-[1.05/1]">
                <Image
                  src={image.url}
                  alt={image.alt || `${name} thumbnail ${imageIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 30vw, 12vw"
                  className="object-cover"
                />
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
