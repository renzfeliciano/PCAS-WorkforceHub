"use client";

import { BackgroundCarousel } from "@/components/background-carousel";

const IMAGES = [
  "/assets/images/login/pcas-login-bg-1.jpg",
  "/assets/images/login/pcas-login-bg-2.jpg",
  "/assets/images/login/pcas-login-bg-3.jpg",
  "/assets/images/login/pcas-login-bg-4.jpg",
  "/assets/images/login/pcas-login-bg-5.jpg",
  "/assets/images/login/pcas-login-bg-6.jpg",
];

export function LoginBackgroundCarousel() {
  return (
    <div className="login-visual" aria-hidden="true">
      <BackgroundCarousel
        images={IMAGES}
        imageClassName="login-visual-image"
        slideClassName="login-visual-slide"
        priority
      />
      <div className="login-visual-scrim" />
    </div>
  );
}
