import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const hue = interpolate(frame, [0, 900], [220, 240]);
  const y1 = Math.sin(frame * 0.006) * 80;
  const y2 = Math.cos(frame * 0.008) * 60;
  const x1 = Math.cos(frame * 0.005) * 40;

  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse 120% 80% at 30% 20%, hsl(${hue}, 30%, 12%) 0%, hsl(${hue + 10}, 20%, 6%) 60%, hsl(${hue - 5}, 15%, 4%) 100%)`,
        }}
      />
      {/* Large warm orb - top right */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(30, 100%, 50%, 0.07) 0%, hsla(30, 100%, 50%, 0.03) 40%, transparent 70%)",
          top: -200 + y1,
          right: -200 + x1,
        }}
      />
      {/* Cool orb - bottom left */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(210, 80%, 50%, 0.06) 0%, transparent 65%)",
          bottom: -150 + y2,
          left: -100 - x1,
        }}
      />
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(hsla(220, 20%, 30%, 0.04) 1px, transparent 1px), linear-gradient(90deg, hsla(220, 20%, 30%, 0.04) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          transform: `translateY(${frame * 0.15}px)`,
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, hsla(220, 20%, 3%, 0.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
