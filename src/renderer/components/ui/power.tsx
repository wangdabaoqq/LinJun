"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@renderer/lib/utils";

export interface PowerIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PowerIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const POWER_VARIANTS: Variants = {
  normal: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.8,
      ease: "easeInOut",
    },
  },
};

const PowerIcon = forwardRef<PowerIconHandle, PowerIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => {
          controls.start("animate");
        },
        stopAnimation: () => {
          controls.start("normal");
        },
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
          <motion.path
            animate={controls}
            d="M18.36 6.64a9 9 0 1 1-12.73 0"
            initial="normal"
            variants={POWER_VARIANTS}
          />
          <motion.line
            animate={controls}
            initial="normal"
            variants={POWER_VARIANTS}
            x1="12"
            x2="12"
            y1="2"
            y2="12"
          />
        </svg>
      </div>
    );
  },
);

PowerIcon.displayName = "PowerIcon";

export { PowerIcon };
