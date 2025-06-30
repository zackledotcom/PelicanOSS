"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";

interface RippleProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const Ripple = React.forwardRef<HTMLDivElement, RippleProps>(
  ({ children, className = "", disabled = false }, ref) => {
    const [ripples, setRipples] = React.useState<
      Array<{ id: number; x: number; y: number }>
    >([]);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple = {
        id: Date.now(),
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
      }, 600);
    };

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden ${className}`}
        onClick={handleClick}
      >
        {children}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            initial={{
              width: 0,
              height: 0,
              x: "-50%",
              y: "-50%",
              opacity: 1,
            }}
            animate={{
              width: 400,
              height: 400,
              opacity: 0,
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    );
  }
);

Ripple.displayName = "Ripple";

export { Ripple };
