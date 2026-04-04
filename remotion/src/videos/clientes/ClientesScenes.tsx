import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Subtitle } from "../../components/Subtitle";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 160 } });
  const tagS = spring({ frame: frame - 25, fps, config: { damping: 20 } });
  const iconScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 120 } });
  const pulse = Math.sin(frame * 0.08) * 0.03 + 1;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 120, transform: `scale(${interpolate(iconScale, [0, 1], [0.3, 1]) * pulse})`, marginBottom: 30, filter: `drop-shadow(0 0 40px hsla(260, 90%, 60%, 0.3))` }}>👥</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 72, fontWeight: 700, color: "white", opacity: interpolate(titleS, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleS, [0, 1], [60, 0])}px)`, letterSpacing: -2 }}>Clientes & CRM</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 28, color: "hsl(38, 92%, 50%)", fontWeight: 600, opacity: interpolate(tagS, [0, 1], [0, 1]), transform: `translateY(${interpolate(tagS, [0, 1], [30, 0])}px)`, marginTop: 16, letterSpacing: 3, textTransform: "uppercase" }}>NovoPeçaí — Relacionamento</div>
      </div>
    </AbsoluteFill>
  );
};

export const Scene2Clientes = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const clients = [
    { name: "Auto Center Silva", type: "PJ", phone: "(11) 99888-7766", credit: "R$ 15.000", purchases: 47 },
    { name: "Oficina do João", type: "PF", phone: "(11) 98765-4321", credit: "R$ 5.000", purchases: 23 },
    { name: "Mecânica Rápida LTDA", type: "PJ", phone: "(11) 91234-5678", credit: "R$ 25.000", purchases: 89 },
    { name: "Retífica Central", type: "PJ", phone: "(11) 97654-3210", credit: "R$ 10.000", purchases: 34 },
  ];

  return (
    <AbsoluteFill style={{ padding: "60px 80px" }}>
      <div style={{ opacity: headerOp, marginBottom: 30 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Cadastro Completo</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Gestão de Clientes</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {clients.map((c, i) => {
          const delay = i * 10 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const y = interpolate(s, [0, 1], [40, 0]);

          return (
            <div key={i} style={{
              width: 420, background: "hsla(220, 20%, 12%, 0.9)", borderRadius: 16,
              padding: "24px", opacity: op, transform: `translateY(${y}px)`,
              border: "1px solid hsla(220, 20%, 22%, 0.5)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: "hsla(260, 60%, 50%, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "white", fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "hsla(0,0%,100%,0.4)" }}>{c.type} • {c.phone}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1, background: "hsla(220, 20%, 16%, 0.8)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "hsla(0,0%,100%,0.4)", textTransform: "uppercase" }}>Crédito</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#22c55e", fontWeight: 600 }}>{c.credit}</div>
                </div>
                <div style={{ flex: 1, background: "hsla(220, 20%, 16%, 0.8)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "hsla(0,0%,100%,0.4)", textTransform: "uppercase" }}>Compras</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "hsl(38, 92%, 50%)", fontWeight: 600 }}>{c.purchases}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Cadastro completo com limite de crédito, histórico de compras e contato WhatsApp." from={25} />
    </AbsoluteFill>
  );
};

export const Scene3CRM = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const features = [
    { icon: "📋", title: "Pipeline Kanban", desc: "Visualize orçamentos por etapa", color: "#3b82f6" },
    { icon: "🔔", title: "Alertas de Recompra", desc: "Saiba quando o cliente vai precisar comprar novamente", color: "#f59e0b" },
    { icon: "💬", title: "Interações", desc: "Registre ligações, visitas e follow-ups", color: "#8b5cf6" },
    { icon: "📊", title: "Rentabilidade", desc: "Saiba quais clientes geram mais lucro", color: "#22c55e" },
    { icon: "💳", title: "Aprovação de Crédito", desc: "Workflow de aprovação com limites", color: "#ec4899" },
    { icon: "🏷️", title: "Preços por Cliente", desc: "Tabelas personalizadas por perfil", color: "#06b6d4" },
  ];

  return (
    <AbsoluteFill style={{ padding: "55px 80px" }}>
      <div style={{ opacity: headerOp, textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>CRM Integrado</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Relacionamento Completo</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
        {features.map((f, i) => {
          const delay = i * 8 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const scale = interpolate(s, [0, 1], [0.6, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              width: 340, background: "hsla(220, 20%, 12%, 0.9)",
              border: `1px solid ${f.color}25`, borderRadius: 16,
              padding: "22px 20px", transform: `scale(${scale})`, opacity: op,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ fontSize: 30, width: 50, height: 50, borderRadius: 14, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.4)", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Pipeline de vendas, alertas inteligentes e histórico completo de cada cliente." from={25} />
    </AbsoluteFill>
  );
};

export const Scene4Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const s2 = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const s3 = spring({ frame: frame - 45, fps, config: { damping: 25 } });
  const pulse = Math.sin(frame * 0.06) * 0.02 + 1;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 56, fontWeight: 700, color: "white", opacity: interpolate(s1, [0, 1], [0, 1]), transform: `translateY(${interpolate(s1, [0, 1], [40, 0])}px) scale(${pulse})`, letterSpacing: -1, marginBottom: 16 }}>Conheça cada cliente.</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 24, color: "hsla(0,0%,100%,0.6)", opacity: interpolate(s2, [0, 1], [0, 1]), transform: `translateY(${interpolate(s2, [0, 1], [20, 0])}px)`, marginBottom: 40 }}>CRM completo no NovoPeçaí</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 32, color: "hsl(38, 92%, 50%)", fontWeight: 700, opacity: interpolate(s3, [0, 1], [0, 1]), transform: `scale(${interpolate(s3, [0, 1], [0.8, 1])})`, letterSpacing: 2 }}>novopecai.com</div>
      </div>
    </AbsoluteFill>
  );
};
