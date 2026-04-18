import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Peca {
  produto: string;
  qtd?: string;
  fornecedor1?: string;
  codigo1?: string;
  status1?: string;
  fornecedor2?: string;
  codigo2?: string;
  status2?: string;
  obs?: string;
}

interface ParsedContent {
  segments: Array<{ type: 'text'; content: string } | { type: 'card'; peca: Peca; index: number }>;
}

function parseContent(text: string): ParsedContent {
  const segments: ParsedContent['segments'] = [];
  const regex = /:::peca\s*([\s\S]*?):::/g;
  let lastIndex = 0;
  let cardIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const peca: Peca = { produto: '' };
    match[1].split('\n').forEach((line) => {
      const m = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
      if (m) (peca as any)[m[1]] = m[2];
    });
    if (peca.produto) {
      cardIdx += 1;
      segments.push({ type: 'card', peca, index: cardIdx });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return { segments };
}

const StatusIcon = ({ status }: { status?: string }) => {
  if (!status) return null;
  const ok = status.toLowerCase().startsWith('ok');
  return <span className="shrink-0">{ok ? '✅' : '⚠️'}</span>;
};

const SupplierRow = ({
  medal,
  name,
  code,
  status,
  textColor,
}: {
  medal: string;
  name?: string;
  code?: string;
  status?: string;
  textColor: string;
}) => {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="shrink-0 text-base">{medal}</span>
      <span className="font-medium min-w-[110px]" style={{ color: textColor }}>{name}</span>
      <span className="flex-1 font-mono text-xs opacity-80 break-all">{code || '—'}</span>
      <StatusIcon status={status} />
    </div>
  );
};

export function PartCards({
  text,
  cardBg,
  cardBorder,
  textColor,
  mutedColor,
  proseColor,
}: {
  text: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  mutedColor: string;
  proseColor: string;
}) {
  const { segments } = parseContent(text);

  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          const trimmed = seg.content.trim();
          if (!trimmed) return null;
          return (
            <div
              key={i}
              className="autoiq-prose text-sm leading-relaxed"
              style={{ color: proseColor }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
            </div>
          );
        }
        const { peca, index } = seg;
        return (
          <div
            key={i}
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b"
              style={{ borderColor: cardBorder }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="shrink-0 text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: cardBorder, color: textColor }}
                >
                  {index}
                </span>
                <span className="font-semibold text-sm truncate">{peca.produto}</span>
              </div>
              {peca.qtd && (
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: cardBorder }}>
                  Qtd: {peca.qtd}
                </span>
              )}
            </div>
            <div className="px-4 py-1" style={{ color: textColor }}>
              <SupplierRow medal="🥇" name={peca.fornecedor1} code={peca.codigo1} status={peca.status1} textColor={textColor} />
              <SupplierRow medal="🥈" name={peca.fornecedor2} code={peca.codigo2} status={peca.status2} textColor={textColor} />
            </div>
            {peca.obs && (
              <div
                className="px-4 py-2 text-xs font-medium border-t flex items-center gap-2"
                style={{ borderColor: cardBorder, color: mutedColor }}
              >
                <span>⚠️</span>
                <span>{peca.obs}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
