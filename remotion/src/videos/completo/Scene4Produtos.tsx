import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

const features = [
  { icon: "🔍", title: "Consultar Estoque", desc: "Busca por código, descrição ou aplicação", color: "#22c55e" },
  { icon: "⚠️", title: "Estoque Baixo", desc: "Alerta automático de itens abaixo do mínimo", color: "#ef4444" },
  { icon: "📊", title: "Sugestão de Reposição", desc: "Cálculo inteligente baseado em vendas", color: "#3b82f6" },
  { icon: "📥", title: "Importar Estoque", desc: "Importação via planilha Excel em massa", color: "#f59e0b" },
  { icon: "➕", title: "Cadastrar Produto", desc: "Cadastro manual com foto e aplicação", color: "#8b5cf6" },
  { icon: "🏭", title: "Fornecedores", desc: "Contatos de distribuidores e vendedores", color: "#06b6d4" },
  { icon: "🔗", title: "Kits de Peças", desc: "Monte kits com desconto automático", color: "#ec4899" },
  { icon: "📈", title: "Histórico de Preços", desc: "Rastreie variações de preço ao longo do tempo", color: "#10b981" },
];

export const Scene4Produtos = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "50px 70px" }}>
      <div style={{ opacity: headerOp, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 44, width: 60, height: 60, borderRadius: 16, background: "hsla(140, 70%, 45%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>📦</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(140, 70%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Gestão de Produtos</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {features.map((f, i) => {
          const delay = i * 6 + 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const y = interpolate(s, [0, 1], [30, 0]);
          return (
            <div key={i} style={{ width: "48%", background: "hsla(220, 20%, 12%, 0.9)", border: `1px solid ${f.color}20`, borderRadius: 14, padding: "16px 18px", opacity: op, transform: `translateY(${y}px)`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 26, width: 44, height: 44, borderRadius: 12, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.45)", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Subtitle text="Estoque completo: busca, alertas, importação, kits e histórico de preços." from={25} />
    </AbsoluteFill>
  );
};
