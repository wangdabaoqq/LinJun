"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@renderer/lib/utils";

export interface SunMoonIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SunMoonIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SUN_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    scale: 1,
  },
  animate: {
    rotate: [0, -15, 15, -8, 8, 0],
    scale: [1, 1.15, 1],
    transition: {
      duration: 1.2,
      ease: "easeInOut",
    },
  },
};

const MOON_VARIANTS: Variants = {
  normal: { opacity: 1, scale: 1 },
  animate: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 1.2,
      ease: "easeInOut",
    },
  },
};

const SunMoonIcon = forwardRef<SunMoonIconHandle, SunMoonIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const sunControls = useAnimation();
    const moonControls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => {
          sunControls.start("animate");
          moonControls.start("animate");
        },
        stopAnimation: () => {
          sunControls.start("normal");
          moonControls.start("normal");
        },
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          sunControls.start("animate");
          moonControls.start("animate");
        }
      },
      [sunControls, moonControls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          sunControls.start("normal");
          moonControls.start("normal");
        }
      },
      [sunControls, moonControls, onMouseLeave],
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
          <motion.g
            animate={sunControls}
            initial="normal"
            variants={SUN_VARIANTS}
          >
            <circle cx="12" cy="12" r="5" />
          </motion.g>
          {[
            "M12 1v2",
            "M12 21v2",
            "m4.9 4.9 1.4 1.4",
            "m17.7 17.7 1.4 1.4",
            "M2 12h2",
            "M20 12h2",
            "m6.3 17.7-1.4 1.4",
            "m19.1 4.9-1.4 1.4",
          ].map((d) => (
            <motion.path
              animate={moonControls}
              d={d}
              initial="normal"
              key={d}
              variants={MOON_VARIANTS}
            />
          ))}
        </svg>
      </div>
    );
  },
);

SunMoonIcon.displayName = "SunMoonIcon";

export { SunMoonIcon };
