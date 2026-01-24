import UseAnimations from "react-useanimations";
import type { Animation } from "react-useanimations/utils";

interface AnimatedIconProps {
  animation: Animation;
  size?: number;
  strokeColor?: string;
  fillColor?: string;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  className?: string;
}

export function AnimatedIcon({
  animation,
  size = 20,
  strokeColor = "currentColor",
  fillColor,
  autoplay,
  loop,
  speed = 1,
  className,
}: AnimatedIconProps) {
  return (
    <div className={className}>
      <UseAnimations
        animation={animation}
        size={size}
        strokeColor={strokeColor}
        fillColor={fillColor}
        autoplay={autoplay}
        loop={loop}
        speed={speed}
      />
    </div>
  );
}
