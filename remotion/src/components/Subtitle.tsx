import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const Subtitle = ({ text, from = 0 }: { text: string; from?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - from;
  if (localFrame < 0) return null;

  const s = spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 150 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: op,
        transform: `translateY(${y}px)`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "hsla(0, 0%, 0%, 0.75)",
          borderRadius: 12,
          padding: "14px 36px",
          maxWidth: 1200,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 22,
            color: "white",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};
