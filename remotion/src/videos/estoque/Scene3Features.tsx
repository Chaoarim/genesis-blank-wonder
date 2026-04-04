import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

export const Scene3Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const features = [
    { icon: "📥", title: "Importar Planilha", desc: "Excel/CSV com mapeamento automático de colunas", color: "#3b82f6" },
    { icon: "⚠️", title: "Estoque Baixo", desc: "Alertas automáticos quando o item atinge o mínimo", color: "#ef4444" },
    { icon: "🔄", title: "Reposição", desc: "Sugestões inteligentes baseadas no histórico de vendas", color: "#22c55e" },
    { icon: "📊", title: "Histórico de Preços", desc: "Acompanhe variações de custo por fornecedor", color: "#8b5cf6" },
    { icon: "📋", title: "Tabela Distribuidor", desc: "Importe e compare preços entre distribuidores", color: "#f59e0b" },
    { icon: "📸", title: "Fotos de Produtos", desc: "Upload de imagem para catálogo e identificação", color: "#06b6d4" },
  ];

  return (
    <AbsoluteFill style={{ padding: "55px 80px" }}>
      <div style={{ opacity: headerOp, textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          Recursos
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>
          Controle Completo do Estoque
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
        {features.map((f, i) => {
          const delay = i * 10 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const scale = interpolate(s, [0, 1], [0.6, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              width: 520, background: "hsla(220, 20%, 12%, 0.9)",
              border: `1px solid ${f.color}25`, borderRadius: 16,
              padding: "24px 24px", transform: `scale(${scale})`, opacity: op,
              display: "flex", alignItems: "center", gap: 18,
            }}>
              <div style={{ fontSize: 36, width: 56, height: 56, borderRadius: 14, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.45)", marginTop: 4 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Importação, alertas, reposição e comparação de preços — gestão profissional." from={30} />
    </AbsoluteFill>
  );
};
