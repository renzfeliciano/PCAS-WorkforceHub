"use client";

import { useState } from "react";
import { CalendarClock, CalendarDays, KanbanSquare, Package, Scale, Users } from "lucide-react";
import { BackgroundCarousel } from "@/components/background-carousel";

const IMAGES = [
  "/assets/images/login/pcas-login-bg-1.jpg",
  "/assets/images/login/pcas-login-bg-2.jpg",
  "/assets/images/login/pcas-login-bg-3.jpg",
  "/assets/images/login/pcas-login-bg-4.jpg",
  "/assets/images/login/pcas-login-bg-5.jpg",
  "/assets/images/login/pcas-login-bg-6.jpg",
];

const HIGHLIGHTS = [
  { icon: Users, label: "Employee records" },
  { icon: CalendarClock, label: "Attendance & leave" },
  { icon: KanbanSquare, label: "Recruitment pipeline" },
  { icon: Scale, label: "Case monitoring" },
  { icon: CalendarDays, label: "Events & calendar" },
  { icon: Package, label: "Asset & travel tracking" },
];

export function LoginBackgroundCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="login-visual" aria-hidden="true">
      <BackgroundCarousel
        images={IMAGES}
        imageClassName="login-visual-image"
        slideClassName="login-visual-slide"
        priority
        sizes="(min-width: 900px) 55vw, 100vw"
        onActiveIndexChange={setActiveIndex}
      />
      <div className="login-visual-scrim" />
      <div className="login-visual-content">
        <p className="login-visual-tagline">Empowering your workforce, end to end.</p>
        <div className="login-visual-highlights">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <span className="login-visual-highlight" key={label}>
              <Icon size={14} /> {label}
            </span>
          ))}
        </div>
        <div className="login-visual-dots">
          {IMAGES.map((src, index) => (
            <span
              key={src}
              className={`login-visual-dot ${index === activeIndex ? "active" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
