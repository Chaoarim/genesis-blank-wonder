import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: spaceGrotesk } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const Scene1Hero = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const titleY = interpolate(spring({ frame: frame - 10, fps, config: { damping: 20 } }), [0, 1], [60, 0]);
  const titleOp = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleOp = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleY = interpolate(spring({ frame: frame - 30, fps, config: { damping: 20 } }), [0, 1], [40, 0]);

  const tagOp = interpolate(frame, [50, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Animated line
  const lineW = interpolate(frame, [60, 100], [0, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Stats
  const statsOp = interpolate(frame, [80, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const count1 = Math.min(Math.floor(interpolate(frame, [85, 130], [0, 26], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), 26);
  const count2 = Math.min(Math.floor(interpolate(frame, [90, 135], [0, 61], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), 61);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Gear icon placeholder */}
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: "50%",
          border: "3px solid hsl(38, 92%, 50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale}) rotate(${frame * 0.5}deg)`,
          marginBottom: 20,
          background: "hsla(38, 92%, 50%, 0.1)",
        }}
      >
        <div style={{ fontSize: 40, color: "hsl(38, 92%, 50%)" }}>⚙</div>
      </div>

      <div
        style={{
          fontFamily: spaceGrotesk,
          fontSize: 72,
          fontWeight: 700,
          color: "white",
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        Novo <span style={{ color: "hsl(38, 92%, 50%)" }}>PeçaI</span>
      </div>

      <div
        style={{
          fontFamily: inter,
          fontSize: 28,
          color: "hsla(0, 0%, 100%, 0.7)",
          opacity: subtitleOp,
          transform: `translateY(${subtitleY}px)`,
          marginTop: 16,
          textAlign: "center",
        }}
      >
        Plataforma Completa para o Setor Automotivo
      </div>

      {/* Animated line */}
      <div
        style={{
          width: lineW,
          height: 3,
          background: "linear-gradient(90deg, transparent, hsl(38, 92%, 50%), transparent)",
          marginTop: 30,
          borderRadius: 2,
        }}
      />

      {/* Tag */}
      <div
        style={{
          opacity: tagOp,
          fontFamily: inter,
          fontSize: 18,
          color: "hsl(38, 92%, 50%)",
          marginTop: 24,
          padding: "8px 24px",
          border: "1px solid hsla(38, 92%, 50%, 0.3)",
          borderRadius: 30,
          background: "hsla(38, 92%, 50%, 0.08)",
        }}
      >
        Substitua planilhas e ERPs genéricos
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 80,
          marginTop: 50,
          opacity: statsOp,
        }}
      >
        <StatItem label="Módulos" value={`${count1}+`} />
        <StatItem label="Veículos" value={`${count2}+`} />
        <StatItem label="Plano Anual" value="R$ 297" />
      </div>
    </AbsoluteFill>
  );
};

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: "white" }}>
      {value}
    </div>
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "hsla(0,0%,100%,0.5)", marginTop: 4 }}>
      {label}
    </div>
  </div>
);
