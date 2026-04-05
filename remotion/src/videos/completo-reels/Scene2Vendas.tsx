import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const features = [
  { icon: "📊", title: "Painel Geral", desc: "Visão 360° com gráficos em tempo real" },
  { icon: "📈", title: "Indicadores", desc: "KPIs: ticket médio, conversão, ranking" },
  { icon: "🛒", title: "Nova Venda", desc: "Busca rápida e cálculo automático" },
  { icon: "📋", title: "Pedidos", desc: "Status e rastreio completo" },
  { icon: "📜", title: "Histórico", desc: "Filtros avançados de vendas" },
  { icon: "💼", title: "Orçamentos", desc: "Pipeline visual CRM" },
  { icon: "📅", title: "Relatório Mensal", desc: "Fechamento com comparativo" },
  { icon: "📡", title: "Vendas por Canal", desc: "Balcão, WhatsApp, catálogo" },
  { icon: "🔮", title: "Previsão de Demanda", desc: "Projeção baseada no histórico" },
  { icon: "📦", title: "Expedição", desc: "Checklist e conferência" },
];

export const Scene2Vendas = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 50px" }}>
      <div style={{ opacity: headerOp, marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40, width: 56, height: 56, borderRadius: 14, background: "hsla(38, 90%, 50%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>🛒</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 13, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: "white", letterSpacing: -1 }}>Central de Vendas</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {features.map((f, i) => {
          const delay = i * 5 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [40, 0]);
          return (
            <div key={i} style={{ background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(38, 80%, 50%, 0.1)", borderRadius: 14, padding: "16px 18px", opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 24, width: 42, height: 42, borderRadius: 12, background: "hsla(220, 20%, 18%, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.45)", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
