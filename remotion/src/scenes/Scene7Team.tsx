import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene7Team = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 80 }}>
      <div
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 20,
          color: "hsl(38, 92%, 50%)",
          fontWeight: 600,
          opacity: headerOp,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Gestão de Equipe
      </div>
      <div
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 44,
          fontWeight: 700,
          color: "white",
          opacity: headerOp,
          marginBottom: 40,
          lineHeight: 1.2,
        }}
      >
        Vendedores, metas e comissões
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Sellers list */}
        <div style={{ flex: 1 }}>
          <Sequence from={15}>
            <SellersList frame={frame - 15} fps={fps} />
          </Sequence>
        </div>

        {/* Features list */}
        <div style={{ flex: 1 }}>
          <Sequence from={25}>
            <FeaturesList frame={frame - 25} fps={fps} />
          </Sequence>
        </div>
      </div>

      <Subtitle text="Cada vendedor tem login próprio com permissões, metas individuais e painel exclusivo." from={20} />
    </AbsoluteFill>
  );
};

const SellersList = ({ frame, fps }: { frame: number; fps: number }) => {
  const sellers = [
    { name: "Carlos Silva", sales: "R$ 12.450", goal: 85 },
    { name: "Ana Oliveira", sales: "R$ 15.200", goal: 102 },
    { name: "Pedro Santos", sales: "R$ 8.900", goal: 60 },
  ];

  const op = interpolate(
    spring({ frame, fps, config: { damping: 18 } }),
    [0, 1], [0, 1]
  );

  return (
    <div style={{ opacity: op }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.5)", marginBottom: 14 }}>
        Ranking de Vendedores — Abril 2026
      </div>
      {sellers.map((s, i) => {
        const itemS = spring({ frame: frame - i * 8, fps, config: { damping: 20 } });
        const itemOp = interpolate(itemS, [0, 1], [0, 1]);
        const barW = interpolate(frame, [i * 8 + 10, i * 8 + 40], [0, s.goal], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div
            key={i}
            style={{
              background: "hsla(220, 20%, 15%, 0.8)",
              border: "1px solid hsla(220, 20%, 25%, 0.5)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 10,
              opacity: itemOp,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "white", fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 16, color: "#22c55e", fontWeight: 700 }}>{s.sales}</div>
            </div>
            <div style={{ background: "hsla(220, 20%, 25%, 0.5)", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(barW, 100)}%`,
                  height: "100%",
                  background: s.goal >= 100 ? "#22c55e" : "hsl(38, 92%, 50%)",
                  borderRadius: 6,
                }}
              />
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.4)", marginTop: 4 }}>
              Meta: {Math.min(Math.round(barW), s.goal)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FeaturesList = ({ frame, fps }: { frame: number; fps: number }) => {
  const features = [
    { icon: "👥", title: "Multi-vendedores", desc: "Cada um com login e permissões" },
    { icon: "🎯", title: "Metas mensais", desc: "Individuais ou por equipe" },
    { icon: "💸", title: "Comissões automáticas", desc: "Por venda, produto ou faixa" },
    { icon: "📊", title: "Relatórios por vendedor", desc: "Performance e ranking" },
    { icon: "🔒", title: "Permissões granulares", desc: "Controle o que cada um acessa" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {features.map((f, i) => {
        const s = spring({ frame: frame - i * 7, fps, config: { damping: 18 } });
        const op = interpolate(s, [0, 1], [0, 1]);
        const x = interpolate(s, [0, 1], [30, 0]);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: op,
              transform: `translateX(${x}px)`,
            }}
          >
            <div style={{ fontSize: 24, width: 40, textAlign: "center" }}>{f.icon}</div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "white", fontWeight: 500 }}>{f.title}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.5)" }}>{f.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
