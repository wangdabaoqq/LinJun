"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@renderer/lib/utils";

export interface HelpCircleIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface HelpCircleIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const HelpCircleIcon = forwardRef<HelpCircleIconHandle, HelpCircleIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave],
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
          <motion.path
            animate={controls}
            d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
            initial="normal"
            transition={{
              duration: 0.4,
              ease: "easeInOut",
            }}
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: { pathLength: [0, 1], opacity: [0, 1] },
            }}
          />
          <motion.path
            animate={controls}
            d="M12 17h.01"
            initial="normal"
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            variants={{
              normal: { scale: 1 },
              animate: { scale: [1, 1.2, 1] },
            }}
          />
        </svg>
      </div>
    );
  },
);

HelpCircleIcon.displayName = "HelpCircleIcon";

export { HelpCircleIcon };
