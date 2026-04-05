import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

const features = [
  { icon: "🏷️", title: "Markup", desc: "Margem automática por fornecedor e categoria" },
  { icon: "🎯", title: "Ofertas & Promoções", desc: "Descontos por produto, cliente ou período" },
  { icon: "🎟️", title: "Cupons de Desconto", desc: "Cupons com validade, limite de uso e valor mínimo" },
  { icon: "📅", title: "Prazos de Pagamento", desc: "Regras automáticas: 30/60/90 dias por faixa" },
  { icon: "📤", title: "Contas a Pagar", desc: "Controle de vencimentos com código de barras" },
  { icon: "📥", title: "Contas a Receber", desc: "Boletos, cheques e parcelas por cliente" },
  { icon: "📊", title: "Curva ABC", desc: "Identifique produtos mais rentáveis automaticamente" },
  { icon: "🔔", title: "Agenda de Cobranças", desc: "Lembretes automáticos de vencimentos" },
  { icon: "💹", title: "Fluxo de Caixa", desc: "Projeção financeira com entradas e saídas" },
  { icon: "💲", title: "Preços por Cliente", desc: "Tabelas diferenciadas por tipo de cliente" },
];

export const Scene5Financeiro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "50px 70px" }}>
      <div style={{ opacity: headerOp, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 44, width: 60, height: 60, borderRadius: 16, background: "hsla(45, 90%, 50%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>💰</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(45, 90%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Financeiro</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {features.map((f, i) => {
          const delay = i * 6 + 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [-30, 0]);
          return (
            <div key={i} style={{ width: "48%", background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(45, 80%, 50%, 0.1)", borderRadius: 14, padding: "16px 18px", opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 26, width: 44, height: 44, borderRadius: 12, background: "hsla(45, 70%, 50%, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.45)", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Subtitle text="Markup, prazos, contas a pagar/receber, fluxo de caixa e curva ABC." from={25} />
    </AbsoluteFill>
  );
};
