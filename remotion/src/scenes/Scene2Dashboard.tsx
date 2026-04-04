import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";

export const Scene2Dashboard = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 80 }}>
      {/* Section title */}
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
        Central de Vendas
      </div>
      <div
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 48,
          fontWeight: 700,
          color: "white",
          opacity: headerOp,
          marginBottom: 50,
        }}
      >
        Dashboard em Tempo Real
      </div>

      {/* KPI cards row */}
      <div style={{ display: "flex", gap: 24 }}>
        <Sequence from={10}>
          <KPICard frame={frame - 10} fps={fps} title="Vendas Hoje" value="R$ 4.850" color="#22c55e" delay={0} />
        </Sequence>
        <Sequence from={18}>
          <KPICard frame={frame - 18} fps={fps} title="Ticket Médio" value="R$ 385" color="#3b82f6" delay={0} />
        </Sequence>
        <Sequence from={26}>
          <KPICard frame={frame - 26} fps={fps} title="Orçamentos" value="12" color="#f59e0b" delay={0} />
        </Sequence>
        <Sequence from={34}>
          <KPICard frame={frame - 34} fps={fps} title="Meta Mensal" value="78%" color="#8b5cf6" delay={0} />
        </Sequence>
      </div>

      {/* Chart mock */}
      <Sequence from={50}>
        <ChartMock frame={frame - 50} fps={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};

const KPICard = ({ frame, fps, title, value, color, delay }: any) => {
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const scale = interpolate(s, [0, 1], [0.8, 1]);
  const op = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        flex: 1,
        background: "hsla(220, 20%, 15%, 0.8)",
        border: "1px solid hsla(220, 20%, 25%, 0.5)",
        borderRadius: 16,
        padding: "28px 24px",
        transform: `scale(${scale})`,
        opacity: op,
      }}
    >
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.5)", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 36, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
};

const ChartMock = ({ frame, fps }: { frame: number; fps: number }) => {
  const op = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bars = [65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72];

  return (
    <div
      style={{
        marginTop: 40,
        background: "hsla(220, 20%, 15%, 0.6)",
        border: "1px solid hsla(220, 20%, 25%, 0.4)",
        borderRadius: 16,
        padding: 32,
        opacity: op,
      }}
    >
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "hsla(0,0%,100%,0.5)", marginBottom: 20 }}>
        Vendas por dia — últimos 12 dias
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 200 }}>
        {bars.map((h, i) => {
          const barH = interpolate(frame, [i * 3, i * 3 + 20], [0, h * 2], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: barH,
                background: `linear-gradient(180deg, hsl(38, 92%, 50%) 0%, hsl(38, 70%, 35%) 100%)`,
                borderRadius: "6px 6px 0 0",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
