import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

export const Scene2NovaVenda = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const steps = [
    { icon: "👤", label: "Selecionar Cliente", detail: "Busca rápida por nome, CNPJ ou código" },
    { icon: "🔍", label: "Adicionar Produtos", detail: "Pesquisa no estoque com preço automático" },
    { icon: "💳", label: "Pagamento", detail: "PIX, cartão, boleto ou a prazo" },
    { icon: "📄", label: "Gerar Recibo / NF", detail: "PDF pronto para impressão ou WhatsApp" },
  ];

  return (
    <AbsoluteFill style={{ padding: "60px 80px" }}>
      <div style={{ opacity: headerOp }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          Passo a Passo
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 52, fontWeight: 700, color: "white", letterSpacing: -1, marginBottom: 50 }}>
          Nova Venda em 4 Passos
        </div>
      </div>

      <div style={{ display: "flex", gap: 30, alignItems: "stretch" }}>
        {steps.map((step, i) => {
          const delay = i * 12 + 20;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const scale = interpolate(s, [0, 1], [0.7, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);
          const y = interpolate(s, [0, 1], [50, 0]);

          const isActive = frame > delay + 15;
          const glow = isActive ? Math.sin((frame - delay) * 0.1) * 0.15 + 0.85 : 0.6;

          return (
            <div key={i} style={{
              flex: 1,
              background: "hsla(220, 20%, 12%, 0.9)",
              border: `1px solid hsla(38, 80%, 50%, ${isActive ? 0.4 : 0.1})`,
              borderRadius: 20,
              padding: "36px 28px",
              transform: `scale(${scale}) translateY(${y}px)`,
              opacity: op,
              textAlign: "center",
              boxShadow: isActive ? `0 0 30px hsla(38, 80%, 50%, ${glow * 0.15})` : "none",
            }}>
              <div style={{ fontSize: 50, marginBottom: 18 }}>{step.icon}</div>
              <div style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 12,
                color: "hsl(38, 92%, 50%)",
                fontWeight: 700,
                marginBottom: 10,
                letterSpacing: 2,
              }}>
                PASSO {i + 1}
              </div>
              <div style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 22,
                color: "white",
                fontWeight: 600,
                marginBottom: 10,
              }}>
                {step.label}
              </div>
              <div style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                color: "hsla(0,0%,100%,0.5)",
                lineHeight: 1.5,
              }}>
                {step.detail}
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Crie vendas completas em segundos — do cliente ao recibo, tudo integrado." from={30} />
    </AbsoluteFill>
  );
};
