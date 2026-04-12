import { Card } from '@/components/ui/card';
import type { RadarInsight } from '@/services/radarMLService';

interface Props { insights: RadarInsight[] }

export function RadarInsightsBlock({ insights }: Props) {
  if (!insights.length) return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a] p-6 text-center text-[#9ca3af]">
      Nenhum insight disponível.
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
        <h3 className="text-lg font-bold mb-1">🧠 Insights de Mercado</h3>
        <p className="text-sm text-[#9ca3af] mb-4">O que os dados do ML dizem sobre esta peça</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <Card key={i} className="bg-[#0f0f0f] border-[#2a2a2a] p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{ins.emoji}</span>
                <div>
                  <h4 className={`font-bold text-sm ${ins.cor}`}>{ins.titulo}</h4>
                  <p className="text-sm text-[#9ca3af] mt-1">{ins.descricao}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
