import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

const features = [
  { icon: "📊", title: "Painel Geral", desc: "Visão 360° das vendas com gráficos em tempo real" },
  { icon: "📈", title: "Indicadores", desc: "KPIs de performance: ticket médio, conversão, ranking" },
  { icon: "🛒", title: "Nova Venda", desc: "Registre vendas com busca rápida e cálculo automático" },
  { icon: "📋", title: "Pedidos", desc: "Gestão completa de pedidos com status e rastreio" },
  { icon: "📜", title: "Histórico", desc: "Consulte todas as vendas com filtros avançados" },
  { icon: "💼", title: "Orçamentos", desc: "Pipeline visual CRM — do orçamento à venda" },
  { icon: "📅", title: "Relatório Mensal", desc: "Fechamento mensal com comparativo de períodos" },
  { icon: "📡", title: "Vendas por Canal", desc: "Analise performance por balcão, WhatsApp, catálogo" },
  { icon: "🔮", title: "Previsão de Demanda", desc: "Projeção de vendas baseada no histórico" },
  { icon: "📦", title: "Expedição", desc: "Conferência de pedidos com checklist e status" },
];

export const Scene2Vendas = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "50px 70px" }}>
      <div style={{ opacity: headerOp, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 44, width: 60, height: 60, borderRadius: 16, background: "hsla(38, 90%, 50%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>🛒</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Central de Vendas</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {features.map((f, i) => {
          const delay = i * 6 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [40, 0]);
          return (
            <div key={i} style={{ width: "48%", background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(38, 80%, 50%, 0.1)", borderRadius: 14, padding: "16px 18px", opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 26, width: 44, height: 44, borderRadius: 12, background: "hsla(220, 20%, 18%, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.45)", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Subtitle text="Controle total das vendas: do orçamento à expedição, tudo em um só lugar." from={30} />
    </AbsoluteFill>
  );
};
