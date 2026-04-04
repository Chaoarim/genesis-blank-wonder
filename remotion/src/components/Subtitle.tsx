import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const Subtitle = ({ text, from = 0 }: { text: string; from?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - from;
  if (localFrame < 0) return null;

  const s = spring({ frame: localFrame, fps, config: { damping: 25, stiffness: 200 } });
  const y = interpolate(s, [0, 1], [20, 0]);
  const op = interpolate(s, [0, 1], [0, 0.95]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 50,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: op,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, hsla(0, 0%, 0%, 0.8) 0%, hsla(220, 20%, 8%, 0.85) 100%)",
          borderRadius: 14,
          padding: "16px 40px",
          maxWidth: 1100,
          border: "1px solid hsla(38, 80%, 50%, 0.15)",
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 21,
            color: "hsla(0, 0%, 100%, 0.92)",
            textAlign: "center",
            lineHeight: 1.5,
            letterSpacing: 0.3,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};
