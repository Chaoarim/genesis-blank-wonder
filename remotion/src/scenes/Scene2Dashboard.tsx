import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene2Dashboard = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Full UI mockup with sidebar
  const uiS = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 100 } });
  const uiScale = interpolate(uiS, [0, 1], [0.92, 1]);
  const uiOp = interpolate(uiS, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ padding: "50px 60px" }}>
      {/* Floating label */}
      <div
        style={{
          position: "absolute",
          top: 45,
          left: 80,
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 16,
          color: "hsl(38, 92%, 50%)",
          fontWeight: 600,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Central de Vendas
      </div>

      {/* Full UI mockup */}
      <div
        style={{
          marginTop: 30,
          display: "flex",
          width: "100%",
          height: 900,
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid hsla(220, 20%, 25%, 0.4)",
          background: "hsla(220, 20%, 10%, 0.7)",
          transform: `scale(${uiScale})`,
          opacity: uiOp,
        }}
      >
        {/* Sidebar */}
        <Sidebar frame={frame} fps={fps} />

        {/* Main content */}
        <div style={{ flex: 1, padding: "30px 36px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "white" }}>
                Dashboard
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.4)", marginTop: 4 }}>
                Sexta-feira, 4 de Abril 2026
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "hsla(220, 20%, 20%, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔔</div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, hsl(38, 92%, 50%), hsl(30, 90%, 40%))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "white" }}>CS</div>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            {[
              { title: "Vendas Hoje", value: "R$ 4.850", change: "+12%", color: "#22c55e", icon: "💰" },
              { title: "Ticket Médio", value: "R$ 385", change: "+5%", color: "#3b82f6", icon: "📊" },
              { title: "Orçamentos", value: "12", change: "3 novos", color: "#f59e0b", icon: "📋" },
              { title: "Meta Mensal", value: "78%", change: "R$ 28k/36k", color: "#8b5cf6", icon: "🎯" },
            ].map((kpi, i) => {
              const kS = spring({ frame: frame - 15 - i * 6, fps, config: { damping: 18, stiffness: 140 } });
              const animatedValue = kpi.title === "Vendas Hoje"
                ? `R$ ${Math.min(Math.floor(interpolate(frame, [20 + i * 6, 60 + i * 6], [0, 4850], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), 4850).toLocaleString("pt-BR")}`
                : kpi.value;

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    background: "hsla(220, 20%, 14%, 0.9)",
                    border: "1px solid hsla(220, 20%, 22%, 0.6)",
                    borderRadius: 14,
                    padding: "20px 18px",
                    transform: `translateY(${interpolate(kS, [0, 1], [30, 0])}px)`,
                    opacity: interpolate(kS, [0, 1], [0, 1]),
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.45)", fontWeight: 500 }}>{kpi.title}</div>
                    <div style={{ fontSize: 16 }}>{kpi.icon}</div>
                  </div>
                  <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: kpi.color }}>
                    {animatedValue}
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "hsla(142, 70%, 50%, 0.7)", marginTop: 6 }}>{kpi.change}</div>
                </div>
              );
            })}
          </div>

          {/* Chart area */}
          <Sequence from={45}>
            <ChartArea frame={frame - 45} fps={fps} />
          </Sequence>
        </div>
      </div>

      <Subtitle text="Dashboard em tempo real: vendas, ticket médio, metas e gráficos atualizados automaticamente." from={20} />
    </AbsoluteFill>
  );
};

const Sidebar = ({ frame, fps }: { frame: number; fps: number }) => {
  const items = [
    { icon: "📊", label: "Dashboard", active: true },
    { icon: "🛒", label: "Nova Venda", active: false },
    { icon: "📋", label: "Orçamentos", active: false },
    { icon: "👥", label: "Clientes", active: false },
    { icon: "📦", label: "Estoque", active: false },
    { icon: "🎯", label: "Metas", active: false },
    { icon: "💸", label: "Comissões", active: false },
    { icon: "🏷️", label: "Catálogo B2B", active: false },
    { icon: "💰", label: "Financeiro", active: false },
    { icon: "📄", label: "Relatórios", active: false },
  ];

  return (
    <div
      style={{
        width: 220,
        background: "hsla(220, 25%, 8%, 0.95)",
        borderRight: "1px solid hsla(220, 20%, 20%, 0.5)",
        padding: "24px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 20, fontWeight: 700, color: "white", marginBottom: 24, paddingLeft: 10 }}>
        Novo<span style={{ color: "hsl(38, 92%, 50%)" }}>PeçaI</span>
      </div>
      {items.map((item, i) => {
        const iS = spring({ frame: frame - 8 - i * 3, fps, config: { damping: 22 } });
        const iOp = interpolate(iS, [0, 1], [0, 1]);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: item.active ? "hsla(38, 92%, 50%, 0.12)" : "transparent",
              opacity: iOp,
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: item.active ? "hsl(38, 92%, 55%)" : "hsla(0,0%,100%,0.5)",
              fontWeight: item.active ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </div>
        );
      })}
    </div>
  );
};

const ChartArea = ({ frame, fps }: { frame: number; fps: number }) => {
  const op = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bars = [45, 62, 38, 75, 55, 88, 70, 92, 60, 85, 78, 95];

  return (
    <div
      style={{
        background: "hsla(220, 20%, 13%, 0.8)",
        border: "1px solid hsla(220, 20%, 22%, 0.5)",
        borderRadius: 14,
        padding: "22px 24px",
        opacity: op,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.5)", fontWeight: 500 }}>Vendas — Últimos 12 dias</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.3)" }}>Atualizado agora</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180 }}>
        {bars.map((h, i) => {
          const barH = interpolate(frame, [i * 2, i * 2 + 18], [0, h * 1.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isHighest = h === 95;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: "100%",
                  height: barH,
                  background: isHighest
                    ? "linear-gradient(180deg, hsl(38, 92%, 55%) 0%, hsl(30, 85%, 40%) 100%)"
                    : "linear-gradient(180deg, hsla(38, 80%, 50%, 0.7) 0%, hsla(38, 60%, 35%, 0.5) 100%)",
                  borderRadius: "5px 5px 2px 2px",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
