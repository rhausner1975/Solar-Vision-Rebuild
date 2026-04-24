import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type CounterProps = {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatter?: (value: number) => string;
  "data-testid"?: string;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function Counter({
  to,
  from = 0,
  duration = 1.6,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
  formatter,
  "data-testid": testId,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [value, setValue] = useState<number>(from);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;

    if (shouldReduceMotion) {
      setValue(to);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const totalMs = duration * 1000;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / totalMs, 1);
      const eased = easeOutCubic(progress);
      const current = from + (to - from) * eased;
      setValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, from, to, duration, shouldReduceMotion]);

  const display = formatter
    ? formatter(value)
    : `${prefix}${value.toFixed(decimals)}${suffix}`;

  return (
    <span ref={ref} className={className} data-testid={testId}>
      {display}
    </span>
  );
}
