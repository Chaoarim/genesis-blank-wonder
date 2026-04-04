import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene5Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainS = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 80 } });
  const scale = interpolate(mainS, [0, 1], [0.85, 1]);
  const op = interpolate(mainS, [0, 1], [0, 1]);

  const priceS = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 100 } });
  const priceScale = interpolate(priceS, [0, 1], [0.5, 1]);
  const priceOp = interpolate(priceS, [0, 1], [0, 1]);

  const pulseScale = 1 + Math.sin(frame * 0.08) * 0.015;

  // Animated ring
  const ringR = interpolate(frame, [0, 180], [0, 720], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Decorative rings */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", border: "1px solid hsla(38, 92%, 50%, 0.08)", transform: `rotate(${ringR}deg)` }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: "1px solid hsla(38, 92%, 50%, 0.05)", transform: `rotate(${-ringR * 0.6}deg)` }} />

      <div style={{ transform: `scale(${scale})`, opacity: op, textAlign: "center", zIndex: 1 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 60, fontWeight: 700, color: "white", lineHeight: 1.15, letterSpacing: -2, marginBottom: 8 }}>
          Tudo que você precisa.
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 60, fontWeight: 700, color: "hsl(38, 92%, 50%)", lineHeight: 1.15, letterSpacing: -2, transform: `scale(${pulseScale})` }}>
          Uma só plataforma.
        </div>

        {/* Price */}
        <div style={{ marginTop: 50, transform: `scale(${priceScale})`, opacity: priceOp }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "hsla(0,0%,100%,0.4)", fontWeight: 400, marginBottom: 8 }}>
            Plano Anual completo por apenas
          </div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 80, fontWeight: 700, color: "hsl(38, 92%, 50%)", lineHeight: 1, letterSpacing: -3 }}>
            R$ 297
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "hsla(0,0%,100%,0.3)", marginTop: 10 }}>
            Acesso completo a todos os módulos
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 40 }}>
          {["100% Online", "Suporte WhatsApp", "Sem fidelidade"].map((t, i) => {
            const bS = spring({ frame: frame - 85 - i * 6, fps, config: { damping: 22 } });
            return (
              <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.5)", display: "flex", alignItems: "center", gap: 6, opacity: interpolate(bS, [0, 1], [0, 1]), transform: `translateY(${interpolate(bS, [0, 1], [15, 0])}px)` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                {t}
              </div>
            );
          })}
        </div>
      </div>

      <Subtitle text="NovoPeçaI — comece a transformar sua loja de autopeças hoje mesmo." from={40} />
    </AbsoluteFill>
  );
};
