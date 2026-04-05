import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const features = [
  { icon: "🏷️", title: "Markup", desc: "Margem automática por fornecedor" },
  { icon: "🎯", title: "Ofertas & Promoções", desc: "Descontos por produto ou período" },
  { icon: "🎟️", title: "Cupons de Desconto", desc: "Com validade e limite de uso" },
  { icon: "📅", title: "Prazos de Pagamento", desc: "30/60/90 dias automático" },
  { icon: "📤", title: "Contas a Pagar", desc: "Controle de vencimentos" },
  { icon: "📥", title: "Contas a Receber", desc: "Boletos e parcelas por cliente" },
  { icon: "📊", title: "Curva ABC", desc: "Produtos mais rentáveis" },
  { icon: "🔔", title: "Agenda de Cobranças", desc: "Lembretes automáticos" },
  { icon: "💹", title: "Fluxo de Caixa", desc: "Projeção de entradas e saídas" },
  { icon: "💲", title: "Preços por Cliente", desc: "Tabelas diferenciadas" },
];

export const Scene5Financeiro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 50px" }}>
      <div style={{ opacity: headerOp, marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40, width: 56, height: 56, borderRadius: 14, background: "hsla(45, 90%, 50%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>💰</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 13, color: "hsl(45, 90%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: "white", letterSpacing: -1 }}>Financeiro</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {features.map((f, i) => {
          const delay = i * 5 + 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [-30, 0]);
          return (
            <div key={i} style={{ background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(45, 80%, 50%, 0.1)", borderRadius: 14, padding: "14px 18px", opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 22, width: 40, height: 40, borderRadius: 10, background: "hsla(45, 70%, 50%, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.45)", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
