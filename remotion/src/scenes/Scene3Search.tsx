import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene3Search = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const searchText = "Pastilha de freio Civic 2020";
  const charsShown = Math.min(Math.floor(interpolate(frame, [15, 60], [0, searchText.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), searchText.length);
  const cursorVisible = frame % 16 < 10;

  // Left panel slides in
  const leftS = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const leftX = interpolate(leftS, [0, 1], [-100, 0]);
  const leftOp = interpolate(leftS, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ padding: "60px 70px" }}>
      <div style={{ display: "flex", gap: 40, height: "100%" }}>
        {/* Left - Search interface */}
        <div style={{ flex: 1.2, transform: `translateX(${leftX}px)`, opacity: leftOp }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 16, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
            Busca Inteligente
          </div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 42, fontWeight: 700, color: "white", marginBottom: 35, lineHeight: 1.15, letterSpacing: -1 }}>
            Encontre qualquer peça<br />em segundos
          </div>

          {/* Search bar */}
          <div
            style={{
              background: "hsla(220, 20%, 12%, 0.95)",
              border: "2px solid hsla(38, 92%, 50%, 0.5)",
              borderRadius: 14,
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
              boxShadow: "0 0 30px hsla(38, 92%, 50%, 0.08)",
            }}
          >
            <div style={{ fontSize: 22, color: "hsl(38, 92%, 50%)" }}>🔍</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "white", flex: 1 }}>
              {searchText.slice(0, charsShown)}
              {cursorVisible && <span style={{ color: "hsl(38, 92%, 50%)", fontWeight: 300 }}>│</span>}
            </div>
          </div>

          {/* Search capabilities */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {["Por código", "Por veículo", "Por aplicação", "Por nome"].map((tag, i) => {
              const tS = spring({ frame: frame - 65 - i * 5, fps, config: { damping: 22 } });
              return (
                <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.5)", padding: "6px 14px", borderRadius: 20, border: "1px solid hsla(220, 20%, 30%, 0.4)", opacity: interpolate(tS, [0, 1], [0, 1]), transform: `scale(${interpolate(tS, [0, 1], [0.8, 1])})` }}>
                  {tag}
                </div>
              );
            })}
          </div>

          {/* Results */}
          <Sequence from={65}>
            <ResultsList frame={frame - 65} fps={fps} />
          </Sequence>
        </div>

        {/* Right - Detail card */}
        <Sequence from={90}>
          <DetailCard frame={frame - 90} fps={fps} />
        </Sequence>
      </div>

      <Subtitle text="Busca por nome, código, veículo ou aplicação com resultados instantâneos." from={20} />
    </AbsoluteFill>
  );
};

const ResultsList = ({ frame, fps }: { frame: number; fps: number }) => {
  const results = [
    { code: "HQJ-2319A", name: "Pastilha Freio Dianteira Ceramic", brand: "Fras-Le", price: "R$ 89,90", stock: 24 },
    { code: "PD-1045", name: "Pastilha Freio Diant. Premium", brand: "Cobreq", price: "R$ 72,50", stock: 18 },
    { code: "BP-4521", name: "Pastilha Freio Dianteira", brand: "Bosch", price: "R$ 95,00", stock: 7 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {results.map((r, i) => {
        const s = spring({ frame: frame - i * 6, fps, config: { damping: 18, stiffness: 160 } });
        const y = interpolate(s, [0, 1], [25, 0]);
        const op = interpolate(s, [0, 1], [0, 1]);
        const isFirst = i === 0;

        return (
          <div
            key={i}
            style={{
              background: isFirst ? "hsla(38, 40%, 15%, 0.6)" : "hsla(220, 20%, 13%, 0.8)",
              border: `1px solid ${isFirst ? "hsla(38, 92%, 50%, 0.3)" : "hsla(220, 20%, 22%, 0.5)"}`,
              borderRadius: 12,
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transform: `translateY(${y}px)`,
              opacity: op,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "hsl(38, 92%, 50%)", marginBottom: 3 }}>
                {r.code} • {r.brand}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "white", fontWeight: 500 }}>{r.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{r.price}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "hsla(0,0%,100%,0.35)" }}>{r.stock} em estoque</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DetailCard = ({ frame, fps }: { frame: number; fps: number }) => {
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const x = interpolate(s, [0, 1], [60, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width: 420,
        background: "hsla(220, 20%, 12%, 0.95)",
        border: "1px solid hsla(220, 20%, 25%, 0.5)",
        borderRadius: 18,
        padding: 28,
        transform: `translateX(${x}px)`,
        opacity: op,
        alignSelf: "flex-start",
        marginTop: 90,
      }}
    >
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "hsl(38, 92%, 50%)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Detalhes da Peça</div>

      <div style={{ width: "100%", height: 160, borderRadius: 12, background: "hsla(220, 20%, 18%, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 60 }}>🔧</div>
      </div>

      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "white", marginBottom: 6 }}>Pastilha Freio Dianteira Ceramic</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.45)", marginBottom: 18 }}>HQJ-2319A • Fras-Le</div>

      {[
        { label: "Aplicação", value: "Honda Civic 2016-2022" },
        { label: "Estoque", value: "24 unidades" },
        { label: "Fornecedor", value: "Distribuidora ABC" },
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid hsla(220, 20%, 22%, 0.3)" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.4)" }}>{item.label}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "white", fontWeight: 500 }}>{item.value}</div>
        </div>
      ))}

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#22c55e" }}>R$ 89,90</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "white", padding: "10px 20px", borderRadius: 10, background: "hsl(38, 92%, 50%)", fontWeight: 600 }}>+ Carrinho</div>
      </div>
    </div>
  );
};
