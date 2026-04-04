import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";

export const Scene4Catalog = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 80 }}>
      <div style={{ display: "flex", gap: 60 }}>
        {/* Left side - text */}
        <div style={{ flex: 1 }}>
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
            Catálogo B2B
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 44,
              fontWeight: 700,
              color: "white",
              opacity: headerOp,
              marginBottom: 30,
              lineHeight: 1.2,
            }}
          >
            Seus clientes fazem pedidos online
          </div>

          <Sequence from={25}>
            <FeatureList frame={frame - 25} fps={fps} />
          </Sequence>
        </div>

        {/* Right side - phone mockup */}
        <Sequence from={15}>
          <PhoneMockup frame={frame - 15} fps={fps} />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

const FeatureList = ({ frame, fps }: { frame: number; fps: number }) => {
  const features = [
    "Link exclusivo por vendedor",
    "Carrinho com WhatsApp integrado",
    "QR Code para compartilhar",
    "Controle de pedidos em tempo real",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {features.map((f, i) => {
        const s = spring({ frame: frame - i * 10, fps, config: { damping: 18 } });
        const op = interpolate(s, [0, 1], [0, 1]);
        const x = interpolate(s, [0, 1], [-30, 0]);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: op,
              transform: `translateX(${x}px)`,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "hsl(38, 92%, 50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "white",
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "hsla(0,0%,100%,0.85)" }}>
              {f}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PhoneMockup = ({ frame, fps }: { frame: number; fps: number }) => {
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const op = interpolate(s, [0, 1], [0, 1]);

  // Scroll simulation
  const scrollY = interpolate(frame, [30, 120], [0, -120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const items = [
    { name: "Filtro de Óleo HB20", price: "R$ 28,90" },
    { name: "Pastilha Freio Onix", price: "R$ 65,00" },
    { name: "Amortecedor Gol G5", price: "R$ 189,90" },
    { name: "Correia Dentada Civic", price: "R$ 42,00" },
    { name: "Vela Ignição Corolla", price: "R$ 35,50" },
  ];

  return (
    <div
      style={{
        width: 340,
        height: 680,
        borderRadius: 40,
        border: "3px solid hsla(220, 20%, 30%, 0.8)",
        background: "hsla(220, 20%, 12%, 0.95)",
        overflow: "hidden",
        transform: `scale(${scale})`,
        opacity: op,
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          height: 44,
          background: "hsla(220, 20%, 15%, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          color: "white",
        }}
      >
        Catálogo B2B
      </div>

      {/* Content */}
      <div style={{ padding: 16, transform: `translateY(${scrollY}px)` }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              background: "hsla(220, 20%, 18%, 0.8)",
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "white", fontWeight: 500 }}>
                {item.name}
              </div>
            </div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 15, color: "#22c55e", fontWeight: 700 }}>
              {item.price}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
