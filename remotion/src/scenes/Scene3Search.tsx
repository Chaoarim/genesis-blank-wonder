import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene3Search = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const searchText = "Pastilha de freio Civic 2020";
  const charsShown = Math.min(Math.floor(interpolate(frame, [20, 70], [0, searchText.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), searchText.length);
  const cursorVisible = frame % 20 < 12;

  return (
    <AbsoluteFill style={{ padding: 80 }}>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 20, color: "hsl(38, 92%, 50%)", fontWeight: 600, opacity: headerOp, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Busca Inteligente</div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 44, fontWeight: 700, color: "white", opacity: headerOp, marginBottom: 40 }}>Encontre qualquer peça em segundos</div>
      <div style={{ background: "hsla(220, 20%, 15%, 0.9)", border: "1px solid hsla(38, 92%, 50%, 0.4)", borderRadius: 12, padding: "20px 28px", display: "flex", alignItems: "center", gap: 12, marginBottom: 30 }}>
        <div style={{ fontSize: 24, color: "hsl(38, 92%, 50%)" }}>🔍</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, color: "white" }}>
          {searchText.slice(0, charsShown)}
          {cursorVisible && <span style={{ color: "hsl(38, 92%, 50%)" }}>|</span>}
        </div>
      </div>
      <Sequence from={75}><ResultsList frame={frame - 75} fps={fps} /></Sequence>
      <Subtitle text="Busque por nome, código, aplicação ou veículo. Resultados instantâneos com preços e fornecedores." from={20} />
    </AbsoluteFill>
  );
};

const ResultsList = ({ frame, fps }: { frame: number; fps: number }) => {
  const results = [
    { code: "HQJ-2319A", name: "Pastilha Freio Dianteira Ceramic", brand: "Fras-Le", price: "R$ 89,90" },
    { code: "PD-1045", name: "Pastilha Freio Diant. Premium", brand: "Cobreq", price: "R$ 72,50" },
    { code: "BP-4521", name: "Pastilha Freio Dianteira", brand: "Bosch", price: "R$ 95,00" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {results.map((r, i) => {
        const s = spring({ frame: frame - i * 8, fps, config: { damping: 18, stiffness: 150 } });
        return (
          <div key={i} style={{ background: "hsla(220, 20%, 15%, 0.7)", border: "1px solid hsla(220, 20%, 25%, 0.5)", borderRadius: 12, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", transform: `translateX(${interpolate(s, [0, 1], [80, 0])}px)`, opacity: interpolate(s, [0, 1], [0, 1]) }}>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsl(38, 92%, 50%)", marginBottom: 4 }}>{r.code} • {r.brand}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "white", fontWeight: 500 }}>{r.name}</div>
            </div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{r.price}</div>
          </div>
        );
      })}
    </div>
  );
};
