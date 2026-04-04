import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { Subtitle } from "../components/Subtitle";

const { fontFamily: spaceGrotesk } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

export const Scene1Hero = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered dramatic reveal
  const ringS = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const ringScale = interpolate(ringS, [0, 1], [0, 1]);
  const ringRotation = interpolate(frame, [0, 150], [0, 360], { extrapolateRight: "clamp" });

  const ring2S = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 100 } });
  const ring2Scale = interpolate(ring2S, [0, 1], [0, 1]);

  const titleS = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 120 } });
  const titleY = interpolate(titleS, [0, 1], [80, 0]);
  const titleOp = interpolate(titleS, [0, 1], [0, 1]);

  const tagS = spring({ frame: frame - 35, fps, config: { damping: 20 } });
  const tagOp = interpolate(tagS, [0, 1], [0, 1]);
  const tagY = interpolate(tagS, [0, 1], [30, 0]);

  const lineW = interpolate(frame, [45, 85], [0, 500], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Floating particles
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: 200 + i * 200 + Math.sin(frame * 0.02 + i) * 30,
    y: 150 + (i % 3) * 250 + Math.cos(frame * 0.015 + i * 2) * 20,
    size: 3 + (i % 3) * 2,
    op: 0.15 + (i % 4) * 0.08,
  }));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "hsl(38, 92%, 55%)",
            left: p.x,
            top: p.y,
            opacity: interpolate(frame, [10, 40], [0, p.op], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      ))}

      {/* Animated rings */}
      <div style={{ position: "relative", width: 140, height: 140, marginBottom: 30 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid hsla(38, 92%, 50%, 0.4)",
            transform: `scale(${ringScale}) rotate(${ringRotation}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 15,
            borderRadius: "50%",
            border: "2px solid hsla(38, 92%, 50%, 0.6)",
            transform: `scale(${ring2Scale}) rotate(${-ringRotation * 0.7}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 50,
            color: "hsl(38, 92%, 50%)",
            transform: `scale(${ring2Scale})`,
          }}
        >
          ⚙
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: spaceGrotesk,
          fontSize: 88,
          fontWeight: 700,
          color: "white",
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          lineHeight: 1,
          letterSpacing: -2,
        }}
      >
        Novo<span style={{ color: "hsl(38, 92%, 50%)" }}>PeçaI</span>
      </div>

      {/* Animated line */}
      <div
        style={{
          width: lineW,
          height: 2,
          background: "linear-gradient(90deg, transparent, hsl(38, 92%, 50%), hsl(38, 70%, 40%), transparent)",
          marginTop: 24,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 26,
          fontWeight: 400,
          color: "hsla(0, 0%, 100%, 0.6)",
          opacity: tagOp,
          transform: `translateY(${tagY}px)`,
          marginTop: 20,
          textAlign: "center",
          letterSpacing: 1,
        }}
      >
        A plataforma que substitui planilhas e ERPs genéricos
      </div>

      {/* Badge */}
      <div
        style={{
          marginTop: 30,
          opacity: interpolate(frame, [55, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          display: "flex",
          gap: 30,
        }}
      >
        {["26+ Módulos", "100% Online", "R$ 297/ano"].map((t, i) => {
          const bS = spring({ frame: frame - 60 - i * 8, fps, config: { damping: 20, stiffness: 180 } });
          return (
            <div
              key={i}
              style={{
                fontFamily: inter,
                fontSize: 15,
                fontWeight: 500,
                color: "hsla(38, 80%, 60%, 0.9)",
                padding: "10px 24px",
                border: "1px solid hsla(38, 92%, 50%, 0.25)",
                borderRadius: 30,
                background: "hsla(38, 92%, 50%, 0.06)",
                transform: `scale(${interpolate(bS, [0, 1], [0.7, 1])})`,
                opacity: interpolate(bS, [0, 1], [0, 1]),
              }}
            >
              {t}
            </div>
          );
        })}
      </div>

      <Subtitle text="Conheça a plataforma completa feita para o mercado de autopeças." from={50} />
    </AbsoluteFill>
  );
};
