import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const features = [
  { icon: "🎯", title: "Metas", desc: "Metas mensais por vendedor com acompanhamento" },
  { icon: "👤", title: "Vendedores", desc: "Login próprio, permissões e código" },
  { icon: "💵", title: "Comissões", desc: "Regras por produto ou faixa de valor" },
  { icon: "💳", title: "Pagto. Comissões", desc: "Registro com período e valor" },
  { icon: "📊", title: "Relatório Equipe", desc: "Ranking e comparativo mensal" },
];

export const Scene6Equipe = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 50px", display: "flex", flexDirection: "column" }}>
      <div style={{ opacity: headerOp, marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40, width: 56, height: 56, borderRadius: 14, background: "hsla(260, 70%, 55%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>🏢</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 13, color: "hsl(260, 70%, 60%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: "white", letterSpacing: -1 }}>Gestão de Equipe</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {features.map((f, i) => {
          const delay = i * 10 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [60, 0]);
          return (
            <div key={i} style={{ background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(260, 60%, 55%, 0.12)", borderRadius: 16, padding: "24px 22px", opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ fontSize: 30, width: 54, height: 54, borderRadius: 14, background: "hsla(260, 50%, 55%, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "hsla(0,0%,100%,0.45)", marginTop: 4 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
