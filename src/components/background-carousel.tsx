"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDE_INTERVAL_MS = 7000;

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type BackgroundCarouselProps = Readonly<{
  images: readonly string[];
  imageClassName: string;
  slideClassName?: string;
  priority?: boolean;
  /** Passed straight to next/image — match this to the rendered width so the right source size is fetched. */
  sizes?: string;
}>;

/**
 * Crossfading, slowly-zooming (Ken Burns) photo backdrop. Starts in the
 * given order to match the server-rendered markup, then shuffles client-side
 * once mounted so each visit/section gets a different sequence.
 */
export function BackgroundCarousel({
  images,
  imageClassName,
  slideClassName = "bg-carousel-slide",
  priority,
  sizes = "100vw",
}: BackgroundCarouselProps) {
  const [order, setOrder] = useState(images);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setOrder(shuffle(images));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  return (
    <>
      {order.map((src, index) => (
        <div
          key={src}
          className={`${slideClassName} ${index === activeIndex ? "active" : ""}`}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={priority && index === 0}
            sizes={sizes}
            className={imageClassName}
          />
        </div>
      ))}
    </>
  );
}
