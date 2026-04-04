import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene5StockFinance = () => {
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
        Estoque & Financeiro
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
        Controle total do seu negócio
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Left - Inventory */}
        <div style={{ flex: 1 }}>
          <Sequence from={15}>
            <ModuleCard frame={frame - 15} fps={fps} icon="📦" title="Gestão de Estoque" items={["Importação em lote via Excel", "Alertas de estoque baixo", "Histórico de preços", "Sugestões de reposição"]} />
          </Sequence>
        </div>
        {/* Right - Finance */}
        <div style={{ flex: 1 }}>
          <Sequence from={30}>
            <ModuleCard frame={frame - 30} fps={fps} icon="💰" title="Financeiro" items={["Contas a pagar e receber", "Fluxo de caixa projetado", "Controle de comissões", "Prazos de pagamento"]} />
          </Sequence>
        </div>
      </div>

      <Subtitle text="Importe seu estoque, controle preços e acompanhe todo o financeiro em um só lugar." from={20} />
    </AbsoluteFill>
  );
};

const ModuleCard = ({ frame, fps, icon, title, items }: { frame: number; fps: number; icon: string; title: string; items: string[] }) => {
  const s = spring({ frame, fps, config: { damping: 18 } });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const op = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        background: "hsla(220, 20%, 15%, 0.8)",
        border: "1px solid hsla(220, 20%, 25%, 0.5)",
        borderRadius: 16,
        padding: 28,
        transform: `scale(${scale})`,
        opacity: op,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "white", marginBottom: 18 }}>
        {title}
      </div>
      {items.map((item, i) => {
        const itemS = spring({ frame: frame - 10 - i * 6, fps, config: { damping: 20 } });
        const itemOp = interpolate(itemS, [0, 1], [0, 1]);
        const itemX = interpolate(itemS, [0, 1], [-20, 0]);
        return (
          <div
            key={i}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              color: "hsla(0,0%,100%,0.75)",
              padding: "6px 0",
              opacity: itemOp,
              transform: `translateX(${itemX}px)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(38, 92%, 50%)", flexShrink: 0 }} />
            {item}
          </div>
        );
      })}
    </div>
  );
};
