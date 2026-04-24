// Client wrapper for scroll-triggered reveal. Pairs with the CSS utility
// `reveal-on-scroll` for browsers that support animation-timeline; falls back
// to an IntersectionObserver-driven class toggle so older browsers get the
// same effect.
"use client";

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If CSS animation-timeline is supported, the stylesheet handles it — skip JS.
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()")) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={
        "transition-all duration-700 ease-out " +
        (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6") +
        " " +
        className
      }
    >
      {children}
    </div>
  );
}
