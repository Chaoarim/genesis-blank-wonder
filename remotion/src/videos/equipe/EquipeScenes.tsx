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
        <div style={{ fontSize: 120, transform: `scale(${interpolate(iconScale, [0, 1], [0.3, 1]) * pulse})`, marginBottom: 30, filter: `drop-shadow(0 0 40px hsla(330, 90%, 55%, 0.3))` }}>🏢</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 72, fontWeight: 700, color: "white", opacity: interpolate(titleS, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleS, [0, 1], [60, 0])}px)`, letterSpacing: -2 }}>Equipe & Comissões</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 28, color: "hsl(38, 92%, 50%)", fontWeight: 600, opacity: interpolate(tagS, [0, 1], [0, 1]), transform: `translateY(${interpolate(tagS, [0, 1], [30, 0])}px)`, marginTop: 16, letterSpacing: 3, textTransform: "uppercase" }}>NovoPeçaí — Gestão de Equipe</div>
      </div>
    </AbsoluteFill>
  );
};

export const Scene2Metas = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const sellers = [
    { name: "Carlos Silva", meta: 50000, atual: 42500, percent: 85 },
    { name: "Ana Paula", meta: 40000, atual: 38200, percent: 96 },
    { name: "Roberto Lima", meta: 45000, atual: 31000, percent: 69 },
    { name: "Juliana Costa", meta: 35000, atual: 35800, percent: 102 },
  ];

  return (
    <AbsoluteFill style={{ padding: "60px 80px" }}>
      <div style={{ opacity: headerOp, marginBottom: 40 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Metas Mensais</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Acompanhe a Performance</div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {sellers.map((s, i) => {
          const delay = i * 10 + 15;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 18 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [50, 0]);

          const barProgress = interpolate(
            frame, [delay + 20, delay + 60], [0, Math.min(s.percent, 100)],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const barColor = s.percent >= 100 ? "#22c55e" : s.percent >= 80 ? "#f59e0b" : "#ef4444";

          return (
            <div key={i} style={{
              flex: 1, background: "hsla(220, 20%, 12%, 0.9)", borderRadius: 16,
              padding: "28px 22px", opacity: op, transform: `translateY(${y}px)`,
              border: "1px solid hsla(220, 20%, 22%, 0.5)", textAlign: "center",
            }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: "hsla(260, 60%, 50%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>👤</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "white", fontWeight: 600, marginBottom: 6 }}>{s.name}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "hsla(0,0%,100%,0.4)", marginBottom: 18 }}>Meta: R$ {(s.meta / 1000).toFixed(0)}k</div>
              
              {/* Progress bar */}
              <div style={{ height: 10, background: "hsla(220, 20%, 20%, 0.5)", borderRadius: 5, marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${barProgress}%`, background: barColor, borderRadius: 5, transition: "none" }} />
              </div>
              
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 28, color: barColor, fontWeight: 700 }}>{Math.round(barProgress)}%</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, marginTop: 4 }}>R$ {(s.atual / 1000).toFixed(1)}k</div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Metas individuais com acompanhamento em tempo real e ranking da equipe." from={25} />
    </AbsoluteFill>
  );
};

export const Scene3Comissoes = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const features = [
    { icon: "💰", title: "Comissões Automáticas", desc: "Cálculo por venda, por produto ou percentual fixo", color: "#22c55e" },
    { icon: "💳", title: "Pagamento de Comissões", desc: "Controle de pagamentos com histórico", color: "#3b82f6" },
    { icon: "🔐", title: "Permissões por Vendedor", desc: "Defina o que cada vendedor pode acessar", color: "#8b5cf6" },
    { icon: "📊", title: "Relatório da Equipe", desc: "Performance individual e comparativa", color: "#f59e0b" },
  ];

  return (
    <AbsoluteFill style={{ padding: "60px 80px" }}>
      <div style={{ opacity: headerOp, marginBottom: 40 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 14, color: "hsl(38, 92%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>Gestão Completa</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 48, fontWeight: 700, color: "white", letterSpacing: -1 }}>Comissões & Permissões</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {features.map((f, i) => {
          const delay = i * 10 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 150 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [-60, 0]);

          return (
            <div key={i} style={{
              background: "hsla(220, 20%, 12%, 0.9)", borderRadius: 16, padding: "28px 32px",
              opacity: op, transform: `translateX(${x}px)`,
              border: `1px solid ${f.color}25`, display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{ fontSize: 40, width: 64, height: 64, borderRadius: 16, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "hsla(0,0%,100%,0.45)", marginTop: 4 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text="Gerencie comissões, metas e permissões de toda a equipe comercial." from={25} />
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
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 56, fontWeight: 700, color: "white", opacity: interpolate(s1, [0, 1], [0, 1]), transform: `translateY(${interpolate(s1, [0, 1], [40, 0])}px) scale(${pulse})`, letterSpacing: -1, marginBottom: 16 }}>Sua equipe mais forte.</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 24, color: "hsla(0,0%,100%,0.6)", opacity: interpolate(s2, [0, 1], [0, 1]), transform: `translateY(${interpolate(s2, [0, 1], [20, 0])}px)`, marginBottom: 40 }}>Gestão de equipe no NovoPeçaí</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 32, color: "hsl(38, 92%, 50%)", fontWeight: 700, opacity: interpolate(s3, [0, 1], [0, 1]), transform: `scale(${interpolate(s3, [0, 1], [0.8, 1])})`, letterSpacing: 2 }}>novopecai.com</div>
      </div>
    </AbsoluteFill>
  );
};
