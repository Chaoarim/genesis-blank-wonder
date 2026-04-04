import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

export const Scene3Pedidos = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const orders = [
    { id: "#4521", client: "Auto Center Silva", total: "R$ 2.340,00", status: "Entregue", color: "#22c55e" },
    { id: "#4520", client: "Oficina do João", total: "R$ 890,50", status: "Em separação", color: "#f59e0b" },
    { id: "#4519", client: "Mecânica Rápida", total: "R$ 5.120,00", status: "Pendente", color: "#3b82f6" },
    { id: "#4518", client: "Retífica Central", total: "R$ 1.750,00", status: "Entregue", color: "#22c55e" },
    { id: "#4517", client: "Auto Peças Norte", total: "R$ 3.200,00", status: "NF emitida", color: "#8b5cf6" },
  ];

  return (
    <AbsoluteFill style={{ padding: "60px 80px" }}>
      <div style={{ opacity: headerOp, marginBottom: 40 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          Gestão de Pedidos
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>
          Acompanhe Todos os Pedidos
        </div>
      </div>

      {/* Table mock */}
      <div style={{ background: "hsla(220, 20%, 10%, 0.8)", borderRadius: 16, overflow: "hidden", border: "1px solid hsla(220, 20%, 20%, 0.5)" }}>
        {/* Header */}
        <div style={{ display: "flex", padding: "16px 28px", borderBottom: "1px solid hsla(220, 20%, 20%, 0.5)", gap: 20 }}>
          {["Pedido", "Cliente", "Total", "Status"].map((h, i) => (
            <div key={i} style={{ flex: i === 1 ? 2 : 1, fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
              {h}
            </div>
          ))}
        </div>
        {/* Rows */}
        {orders.map((order, i) => {
          const delay = i * 8 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [40, 0]);

          return (
            <div key={i} style={{
              display: "flex",
              padding: "18px 28px",
              borderBottom: i < orders.length - 1 ? "1px solid hsla(220, 20%, 18%, 0.4)" : "none",
              gap: 20,
              opacity: op,
              transform: `translateX(${x}px)`,
            }}>
              <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 16, color: "hsla(0,0%,100%,0.7)", fontWeight: 600 }}>{order.id}</div>
              <div style={{ flex: 2, fontFamily: "Inter, sans-serif", fontSize: 16, color: "white" }}>{order.client}</div>
              <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 16, color: "hsl(38, 92%, 50%)", fontWeight: 600 }}>{order.total}</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: order.color,
                  background: `${order.color}18`,
                  padding: "4px 14px",
                  borderRadius: 20,
                  fontWeight: 600,
                }}>
                  {order.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Histórico completo, filtros por status, cliente e período — tudo rastreável." from={25} />
    </AbsoluteFill>
  );
};
