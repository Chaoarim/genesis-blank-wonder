import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene5Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainS = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const scale = interpolate(mainS, [0, 1], [0.9, 1]);
  const op = interpolate(mainS, [0, 1], [0, 1]);

  const subOp = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const modules = [
    "Vendas", "Estoque", "Clientes", "Metas", "Comissões", "Expedição",
    "Orçamentos CRM", "NF-e", "Catálogo B2B", "Garantias",
  ];

  const pulseScale = 1 + Math.sin(frame * 0.1) * 0.02;

  // Badge stagger
  const badgeStart = 50;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${scale})`, opacity: op, textAlign: "center" }}>
        {/* Main headline */}
        <div
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 56,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          Tudo que você precisa.
        </div>
        <div
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 56,
            fontWeight: 700,
            color: "hsl(38, 92%, 50%)",
            lineHeight: 1.2,
            transform: `scale(${pulseScale})`,
          }}
        >
          Uma só plataforma.
        </div>

        {/* Module badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
            marginTop: 50,
            maxWidth: 800,
            opacity: subOp,
          }}
        >
          {modules.map((m, i) => {
            const s = spring({ frame: frame - badgeStart - i * 4, fps, config: { damping: 20, stiffness: 180 } });
            const badgeScale = interpolate(s, [0, 1], [0.5, 1]);
            const badgeOp = interpolate(s, [0, 1], [0, 1]);

            return (
              <div
                key={i}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  color: "white",
                  padding: "10px 22px",
                  borderRadius: 30,
                  background: "hsla(220, 20%, 18%, 0.8)",
                  border: "1px solid hsla(38, 92%, 50%, 0.3)",
                  transform: `scale(${badgeScale})`,
                  opacity: badgeOp,
                }}
              >
                {m}
              </div>
            );
          })}
        </div>

        {/* Price tag */}
        <div
          style={{
            marginTop: 50,
            opacity: interpolate(frame, [110, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "hsla(0,0%,100%,0.5)" }}>
            Plano Anual completo por apenas
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 64,
              fontWeight: 700,
              color: "hsl(38, 92%, 50%)",
              marginTop: 8,
            }}
          >
            R$ 297
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
