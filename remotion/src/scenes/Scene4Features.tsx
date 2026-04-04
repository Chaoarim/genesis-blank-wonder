import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { Subtitle } from "../components/Subtitle";

export const Scene4Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const modules = [
    { icon: "🛒", title: "Nova Venda", desc: "Fluxo completo com recibo", color: "#22c55e" },
    { icon: "📋", title: "Orçamentos CRM", desc: "Pipeline Kanban visual", color: "#3b82f6" },
    { icon: "📦", title: "Gestão de Estoque", desc: "Importação e alertas", color: "#f59e0b" },
    { icon: "👥", title: "Clientes", desc: "Cadastro e histórico", color: "#8b5cf6" },
    { icon: "🎯", title: "Metas & Comissões", desc: "Por vendedor e equipe", color: "#ec4899" },
    { icon: "🏷️", title: "Catálogo B2B", desc: "Link + QR + WhatsApp", color: "#06b6d4" },
    { icon: "📄", title: "NF-e", desc: "Emissão simplificada", color: "#14b8a6" },
    { icon: "🚚", title: "Expedição", desc: "Conferência de pedidos", color: "#f97316" },
    { icon: "💰", title: "Financeiro", desc: "Contas a pagar/receber", color: "#22c55e" },
    { icon: "🔄", title: "Garantias", desc: "Devoluções e trocas", color: "#ef4444" },
    { icon: "📊", title: "Relatórios", desc: "Curva ABC e mais", color: "#6366f1" },
    { icon: "👤", title: "Multi-vendedores", desc: "Logins e permissões", color: "#a855f7" },
  ];

  return (
    <AbsoluteFill style={{ padding: "55px 70px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 16, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", opacity: headerOp, marginBottom: 10 }}>
          Tudo em um só lugar
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", opacity: headerOp, letterSpacing: -1 }}>
          26+ Módulos Integrados
        </div>
      </div>

      {/* Grid of modules */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: 1500, margin: "0 auto" }}>
        {modules.map((m, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const delay = row * 6 + col * 4 + 20;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const scale = interpolate(s, [0, 1], [0.6, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);
          const y = interpolate(s, [0, 1], [40, 0]);

          return (
            <div
              key={i}
              style={{
                width: 260,
                background: "hsla(220, 20%, 12%, 0.9)",
                border: "1px solid hsla(220, 20%, 22%, 0.5)",
                borderRadius: 16,
                padding: "22px 20px",
                transform: `scale(${scale}) translateY(${y}px)`,
                opacity: op,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ fontSize: 28, width: 44, height: 44, borderRadius: 12, background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "white", fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.4)" }}>{m.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Vendas, estoque, CRM, financeiro, expedição, catálogo B2B e muito mais — tudo integrado." from={25} />
    </AbsoluteFill>
  );
};
