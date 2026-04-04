import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

export const Scene2Consulta = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const items = [
    { codigo: "FLT-0452", produto: "Filtro de Óleo HB20", qtd: 45, preco: "R$ 32,90", fornecedor: "Tecfil" },
    { codigo: "PST-1203", produto: "Pastilha Freio Civic", qtd: 12, preco: "R$ 89,00", fornecedor: "Cobreq" },
    { codigo: "AMT-0891", produto: "Amortecedor Gol G5", qtd: 8, preco: "R$ 145,00", fornecedor: "Cofap" },
    { codigo: "CRR-0234", produto: "Correia Dentada Corolla", qtd: 23, preco: "R$ 67,50", fornecedor: "Gates" },
    { codigo: "VLV-0567", produto: "Válvula Termostática Celta", qtd: 3, preco: "R$ 42,00", fornecedor: "MTE" },
  ];

  // Search bar animation
  const searchS = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const searchOp = interpolate(searchS, [0, 1], [0, 1]);
  const typedChars = Math.min(Math.floor((frame - 15) * 0.6), 12);
  const searchText = "filtro oleo".substring(0, Math.max(0, typedChars));

  return (
    <AbsoluteFill style={{ padding: "60px 80px" }}>
      <div style={{ opacity: headerOp, marginBottom: 30 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          Consulta Rápida
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>
          Busca Inteligente no Estoque
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        background: "hsla(220, 20%, 14%, 0.9)", borderRadius: 14, padding: "16px 24px",
        marginBottom: 24, border: "1px solid hsla(38, 80%, 50%, 0.3)",
        opacity: searchOp, display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>🔍</span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "white" }}>
          {searchText}<span style={{ opacity: Math.sin(frame * 0.15) > 0 ? 1 : 0, color: "hsl(38, 92%, 50%)" }}>|</span>
        </span>
      </div>

      {/* Results table */}
      <div style={{ background: "hsla(220, 20%, 10%, 0.8)", borderRadius: 16, overflow: "hidden", border: "1px solid hsla(220, 20%, 20%, 0.5)" }}>
        <div style={{ display: "flex", padding: "14px 24px", borderBottom: "1px solid hsla(220, 20%, 20%, 0.5)", gap: 16 }}>
          {["Código", "Produto", "Qtd", "Preço", "Fornecedor"].map((h, i) => (
            <div key={i} style={{ flex: i === 1 ? 2.5 : 1, fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
          ))}
        </div>
        {items.map((item, i) => {
          const delay = i * 7 + 25;
          const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [30, 0]);
          const isLow = item.qtd <= 10;

          return (
            <div key={i} style={{
              display: "flex", padding: "14px 24px",
              borderBottom: i < items.length - 1 ? "1px solid hsla(220, 20%, 18%, 0.4)" : "none",
              gap: 16, opacity: op, transform: `translateX(${x}px)`,
              background: isLow ? "hsla(0, 80%, 50%, 0.05)" : "transparent",
            }}>
              <div style={{ flex: 1, fontFamily: "monospace", fontSize: 14, color: "hsla(0,0%,100%,0.6)" }}>{item.codigo}</div>
              <div style={{ flex: 2.5, fontFamily: "Inter, sans-serif", fontSize: 15, color: "white" }}>{item.produto}</div>
              <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 15, color: isLow ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                {item.qtd} {isLow && "⚠️"}
              </div>
              <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 15, color: "hsl(38, 92%, 50%)", fontWeight: 600 }}>{item.preco}</div>
              <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.5)" }}>{item.fornecedor}</div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Busque por código, descrição ou veículo — com alerta de estoque baixo." from={30} />
    </AbsoluteFill>
  );
};
