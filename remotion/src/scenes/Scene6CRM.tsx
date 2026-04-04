import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene6CRM = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 80 }}>
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
        CRM & Orçamentos
      </div>
      <div
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 44,
          fontWeight: 700,
          color: "white",
          opacity: headerOp,
          marginBottom: 40,
          lineHeight: 1.2,
        }}
      >
        Pipeline visual de negociações
      </div>

      {/* Kanban board mock */}
      <Sequence from={15}>
        <KanbanBoard frame={frame - 15} fps={fps} />
      </Sequence>

      <Subtitle text="Acompanhe cada orçamento do contato inicial até o fechamento com o pipeline visual Kanban." from={15} />
    </AbsoluteFill>
  );
};

const KanbanBoard = ({ frame, fps }: { frame: number; fps: number }) => {
  const columns = [
    { title: "Novo", color: "#3b82f6", items: ["Orç. #142 — Auto Center Silva", "Orç. #145 — Mec. Rápida"] },
    { title: "Negociando", color: "#f59e0b", items: ["Orç. #138 — Oficina Central", "Orç. #140 — Retífica SP"] },
    { title: "Proposta Enviada", color: "#8b5cf6", items: ["Orç. #135 — Fleet Motors"] },
    { title: "Fechado ✓", color: "#22c55e", items: ["Orç. #130 — Auto Peças JR", "Orç. #132 — Mec. Premium"] },
  ];

  return (
    <div style={{ display: "flex", gap: 18 }}>
      {columns.map((col, ci) => {
        const s = spring({ frame: frame - ci * 8, fps, config: { damping: 18 } });
        const op = interpolate(s, [0, 1], [0, 1]);
        const y = interpolate(s, [0, 1], [40, 0]);

        return (
          <div
            key={ci}
            style={{
              flex: 1,
              background: "hsla(220, 20%, 13%, 0.9)",
              border: "1px solid hsla(220, 20%, 25%, 0.4)",
              borderRadius: 14,
              padding: 16,
              opacity: op,
              transform: `translateY(${y}px)`,
            }}
          >
            <div
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: col.color,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
              {col.title}
              <span style={{ fontSize: 12, color: "hsla(0,0%,100%,0.4)", marginLeft: "auto" }}>{col.items.length}</span>
            </div>
            {col.items.map((item, ii) => {
              const itemS = spring({ frame: frame - ci * 8 - 15 - ii * 6, fps, config: { damping: 20 } });
              const itemOp = interpolate(itemS, [0, 1], [0, 1]);
              return (
                <div
                  key={ii}
                  style={{
                    background: "hsla(220, 20%, 18%, 0.8)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    marginBottom: 8,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    color: "hsla(0,0%,100%,0.8)",
                    opacity: itemOp,
                    borderLeft: `3px solid ${col.color}`,
                  }}
                >
                  {item}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
