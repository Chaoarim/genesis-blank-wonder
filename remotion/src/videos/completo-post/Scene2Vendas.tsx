import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const features = [
  { icon: "📊", title: "Painel Geral", desc: "Visão 360° em tempo real" },
  { icon: "📈", title: "Indicadores", desc: "KPIs de performance" },
  { icon: "🛒", title: "Nova Venda", desc: "Busca rápida e cálculo auto" },
  { icon: "📋", title: "Pedidos", desc: "Status e rastreio" },
  { icon: "📜", title: "Histórico", desc: "Filtros avançados" },
  { icon: "💼", title: "Orçamentos", desc: "Pipeline visual CRM" },
  { icon: "📅", title: "Relatório Mensal", desc: "Comparativo de períodos" },
  { icon: "📡", title: "Vendas por Canal", desc: "Balcão, WhatsApp, catálogo" },
  { icon: "🔮", title: "Prev. Demanda", desc: "Projeção de vendas" },
  { icon: "📦", title: "Expedição", desc: "Checklist e conferência" },
];

export const Scene2Vendas = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "40px 40px" }}>
      <div style={{ opacity: headerOp, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 36, width: 50, height: 50, borderRadius: 14, background: "hsla(38, 90%, 50%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>🛒</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 11, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 3, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 34, fontWeight: 700, color: "white", letterSpacing: -1 }}>Central de Vendas</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {features.map((f, i) => {
          const delay = i * 5 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [30, 0]);
          return (
            <div key={i} style={{ width: "48%", background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(38, 80%, 50%, 0.1)", borderRadius: 12, padding: "12px 14px", opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 20, width: 36, height: 36, borderRadius: 10, background: "hsla(220, 20%, 18%, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "hsla(0,0%,100%,0.45)", marginTop: 1 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
