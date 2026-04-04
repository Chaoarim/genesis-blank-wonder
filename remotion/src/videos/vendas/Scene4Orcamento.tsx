import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

export const Scene4Orcamento = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const columns = [
    { title: "Novo", color: "#3b82f6", count: 4, items: ["Oficina SP - R$2.100", "Auto Center - R$890"] },
    { title: "Enviado", color: "#f59e0b", count: 3, items: ["Mec. Rápida - R$5.400", "Retífica - R$1.200"] },
    { title: "Negociando", color: "#8b5cf6", count: 2, items: ["Peças Norte - R$3.800"] },
    { title: "Fechado ✅", color: "#22c55e", count: 5, items: ["Auto Silva - R$7.600", "Frota ABC - R$4.200"] },
  ];

  return (
    <AbsoluteFill style={{ padding: "60px 80px" }}>
      <div style={{ opacity: headerOp, marginBottom: 40 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          CRM de Orçamentos
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>
          Pipeline Visual Kanban
        </div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {columns.map((col, i) => {
          const delay = i * 10 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 150 } });
          const scale = interpolate(s, [0, 1], [0.8, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              flex: 1,
              background: "hsla(220, 20%, 10%, 0.8)",
              borderRadius: 16,
              padding: "20px 18px",
              transform: `scale(${scale})`,
              opacity: op,
              border: `1px solid ${col.color}30`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: col.color, fontWeight: 700 }}>
                  {col.title}
                </div>
                <div style={{
                  fontFamily: "Inter, sans-serif", fontSize: 13, color: "white",
                  background: `${col.color}25`, borderRadius: 20, padding: "2px 10px", fontWeight: 600,
                }}>
                  {col.count}
                </div>
              </div>

              {col.items.map((item, j) => {
                const cardDelay = delay + j * 8 + 15;
                const cs = spring({ frame: frame - cardDelay, fps, config: { damping: 20 } });
                const cardOp = interpolate(cs, [0, 1], [0, 1]);
                const cardY = interpolate(cs, [0, 1], [20, 0]);

                return (
                  <div key={j} style={{
                    background: "hsla(220, 20%, 14%, 0.9)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    marginBottom: 10,
                    opacity: cardOp,
                    transform: `translateY(${cardY}px)`,
                    borderLeft: `3px solid ${col.color}`,
                  }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "white" }}>{item}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Subtitle text="Arraste orçamentos entre etapas e converta em venda com 1 clique." from={25} />
    </AbsoluteFill>
  );
};
