import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const hueShift = interpolate(frame, [0, 750], [0, 30]);
  const y = Math.sin(frame * 0.008) * 50;

  return (
    <AbsoluteFill>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, hsl(${220 + hueShift}, 20%, 8%) 0%, hsl(${230 + hueShift}, 25%, 12%) 50%, hsl(${210 + hueShift}, 18%, 6%) 100%)`,
        }}
      />
      {/* Floating amber accent orb */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(38, 92%, 50%, 0.12) 0%, transparent 70%)",
          top: 200 + y,
          right: -100,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(220, 60%, 50%, 0.08) 0%, transparent 70%)",
          bottom: 100 - y * 0.5,
          left: -50,
          filter: "blur(40px)",
        }}
      />
    </AbsoluteFill>
  );
};
