import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 160 } });
  const tagS = spring({ frame: frame - 25, fps, config: { damping: 20 } });
  const iconScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 120 } });
  const pulse = Math.sin(frame * 0.08) * 0.03 + 1;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 120, transform: `scale(${interpolate(iconScale, [0, 1], [0.3, 1]) * pulse})`, marginBottom: 30, filter: `drop-shadow(0 0 40px hsla(140, 90%, 45%, 0.3))` }}>💰</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 72, fontWeight: 700, color: "white", opacity: interpolate(titleS, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleS, [0, 1], [60, 0])}px)`, letterSpacing: -2 }}>Gestão Financeira</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 28, color: "hsl(38, 92%, 50%)", fontWeight: 600, opacity: interpolate(tagS, [0, 1], [0, 1]), transform: `translateY(${interpolate(tagS, [0, 1], [30, 0])}px)`, marginTop: 16, letterSpacing: 3, textTransform: "uppercase" }}>NovoPeçaí — Controle Financeiro</div>
      </div>
    </AbsoluteFill>
  );
};

export const Scene2Dashboard = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const stats = [
    { label: "Contas a Receber", value: "R$ 45.200", icon: "📥", color: "#22c55e" },
    { label: "Contas a Pagar", value: "R$ 18.500", icon: "📤", color: "#ef4444" },
    { label: "Fluxo de Caixa", value: "R$ 26.700", icon: "📊", color: "#3b82f6" },
    { label: "Faturamento Mês", value: "R$ 127.000", icon: "💰", color: "#f59e0b" },
  ];

  // Chart bars animation
  const barData = [65, 82, 45, 90, 73, 88, 56];
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <AbsoluteFill style={{ padding: "55px 80px" }}>
      <div style={{ opacity: headerOp, marginBottom: 30 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Visão Geral</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Painel Financeiro</div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
        {stats.map((s, i) => {
          const delay = i * 8 + 10;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 18 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [30, 0]);

          return (
            <div key={i} style={{
              flex: 1, background: "hsla(220, 20%, 12%, 0.9)", borderRadius: 14,
              padding: "20px 22px", opacity: op, transform: `translateY(${y}px)`,
              border: `1px solid ${s.color}20`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.5)" }}>{s.label}</span>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 26, color: s.color, fontWeight: 700 }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{ background: "hsla(220, 20%, 10%, 0.8)", borderRadius: 16, padding: "24px 28px", border: "1px solid hsla(220, 20%, 20%, 0.5)" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "hsla(0,0%,100%,0.5)", marginBottom: 20 }}>Vendas da Semana</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 180, justifyContent: "center" }}>
          {barData.map((val, i) => {
            const delay = i * 6 + 30;
            const barH = interpolate(frame, [delay, delay + 30], [0, val * 1.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: 60, height: barH, background: `linear-gradient(to top, hsl(38, 92%, 50%), hsl(30, 90%, 55%))`, borderRadius: "8px 8px 2px 2px" }} />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.4)" }}>{days[i]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Subtitle text="Receitas, despesas e fluxo de caixa — controle financeiro completo." from={25} />
    </AbsoluteFill>
  );
};

export const Scene3Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const features = [
    { icon: "📋", title: "Contas a Pagar", desc: "Controle de vencimentos com código de barras", color: "#ef4444" },
    { icon: "💳", title: "Contas a Receber", desc: "Boletos, cheques e parcelas por cliente", color: "#22c55e" },
    { icon: "📈", title: "Curva ABC", desc: "Identifique seus produtos mais rentáveis", color: "#3b82f6" },
    { icon: "📅", title: "Agenda de Cobranças", desc: "Lembretes automáticos de vencimentos", color: "#f59e0b" },
    { icon: "🏷️", title: "Markup Inteligente", desc: "Margem automática por fornecedor", color: "#8b5cf6" },
    { icon: "🎟️", title: "Cupons de Desconto", desc: "Promoções com validade e uso limitado", color: "#ec4899" },
  ];

  return (
    <AbsoluteFill style={{ padding: "55px 80px" }}>
      <div style={{ opacity: headerOp, textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Recursos Financeiros</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Tudo que Você Precisa</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
        {features.map((f, i) => {
          const delay = i * 8 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const scale = interpolate(s, [0, 1], [0.6, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              width: 340, background: "hsla(220, 20%, 12%, 0.9)",
              border: `1px solid ${f.color}25`, borderRadius: 16,
              padding: "22px 20px", transform: `scale(${scale})`, opacity: op,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ fontSize: 30, width: 50, height: 50, borderRadius: 14, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.4)", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Contas, markup, cupons e curva ABC — finanças sob controle total." from={25} />
    </AbsoluteFill>
  );
};

export const Scene4Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const s2 = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const s3 = spring({ frame: frame - 45, fps, config: { damping: 25 } });
  const pulse = Math.sin(frame * 0.06) * 0.02 + 1;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 56, fontWeight: 700, color: "white", opacity: interpolate(s1, [0, 1], [0, 1]), transform: `translateY(${interpolate(s1, [0, 1], [40, 0])}px) scale(${pulse})`, letterSpacing: -1, marginBottom: 16 }}>Lucre mais. Gaste menos.</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 24, color: "hsla(0,0%,100%,0.6)", opacity: interpolate(s2, [0, 1], [0, 1]), transform: `translateY(${interpolate(s2, [0, 1], [20, 0])}px)`, marginBottom: 40 }}>Financeiro completo no NovoPeçaí</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 32, color: "hsl(38, 92%, 50%)", fontWeight: 700, opacity: interpolate(s3, [0, 1], [0, 1]), transform: `scale(${interpolate(s3, [0, 1], [0.8, 1])})`, letterSpacing: 2 }}>novopecai.com</div>
      </div>
    </AbsoluteFill>
  );
};
