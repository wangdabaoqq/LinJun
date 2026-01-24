"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@renderer/lib/utils";

export interface CircleIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CircleIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  stroke?: boolean;
}

const CIRCLE_VARIANTS: Variants = {
  normal: {
    scale: 1,
  },
  animate: {
    scale: [1, 0.9, 1],
    transition: {
      duration: 0.8,
      ease: "easeInOut",
    },
  },
};

const CircleIcon = forwardRef<CircleIconHandle, CircleIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      stroke = false,
      ...props
    },
    ref,
  ) => {
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
          fill={stroke ? "none" : "currentColor"}
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.circle
            animate={controls}
            cx="12"
            cy="12"
            r={stroke ? "9" : "10"}
            initial="normal"
            variants={CIRCLE_VARIANTS}
          />
          {stroke && (
            <motion.line
              animate={controls}
              initial="normal"
              variants={CIRCLE_VARIANTS}
              x1="4.93"
              x2="19.07"
              y1="4.93"
              y2="19.07"
            />
          )}
        </svg>
      </div>
    );
  },
);

CircleIcon.displayName = "CircleIcon";

export { CircleIcon };
