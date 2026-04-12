import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';
import { getReputationBadge, type RadarSellerProfile } from '@/services/radarMLService';

interface Props { sellers: RadarSellerProfile[] }

export function RadarSellersBlock({ sellers }: Props) {
  if (!sellers.length) return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a] p-6 text-center text-[#9ca3af]">
      Nenhum dado de vendedor disponível.
    </Card>
  );

  const chartData = sellers.map((s, i) => ({
    name: s.seller?.nickname || `Vendedor ${i + 1}`,
    share: s.share,
  }));

  const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
        <h3 className="text-lg font-bold mb-1">👑 Os Melhores Vendedores deste Produto</h3>
        <p className="text-sm text-[#9ca3af] mb-4">Quem domina as vendas no ML para esta peça</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sellers.map((s, i) => {
            const rep = getReputationBadge(s.seller?.seller_reputation?.level_id);
            const sr = s.seller?.seller_reputation;
            const metrics = sr?.metrics;
            const ratings = sr?.transactions?.ratings;
            const posPercent = ratings ? Math.round((ratings.positive / Math.max(ratings.positive + ratings.negative + ratings.neutral, 1)) * 100) : null;

            return (
              <Card key={i} className="bg-[#0f0f0f] border-[#2a2a2a] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-blue-400">#{i + 1}</span>
                  <h4 className="font-bold text-white truncate">{s.seller?.nickname || '—'}</h4>
                  <Badge className={`${rep.cor} text-[10px]`}>{rep.emoji} {rep.label}</Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p>📦 Vendas desta peça: <span className="font-bold text-white">{s.vendas}</span></p>
                  <p>📊 Market share: <span className="font-bold text-blue-400">{s.share}%</span></p>
                  <p>💰 Preço praticado: <span className="font-bold text-green-400">R$ {s.precoMedio.toFixed(2)}</span></p>
                  <p>📍 {s.seller?.address?.city || ''} - {s.seller?.address?.state || ''}</p>
                  {s.seller?.registration_date && (
                    <p>🕐 No ML desde: {new Date(s.seller.registration_date).getFullYear()}</p>
                  )}
                  {sr && (
                    <div className="mt-2 pt-2 border-t border-[#2a2a2a] space-y-1 text-xs text-[#9ca3af]">
                      <p>✅ Vendas concluídas: {sr.transactions?.completed?.toLocaleString('pt-BR') || '—'}</p>
                      {metrics?.cancellations && <p>❌ Cancelamentos: {(metrics.cancellations.rate * 100).toFixed(1)}%</p>}
                      {metrics?.delayed_handling_time && <p>⏱️ Atraso na entrega: {(metrics.delayed_handling_time.rate * 100).toFixed(1)}%</p>}
                      {posPercent !== null && <p>😊 Avaliações positivas: {posPercent}%</p>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  {s.seller?.permalink && (
                    <a href={s.seller.permalink} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-xs border-[#2a2a2a] text-blue-400">
                        <ExternalLink className="w-3 h-3 mr-1" /> Ver Loja
                      </Button>
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Share chart */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a] p-4">
        <h4 className="text-sm font-bold mb-3">Participação de mercado (%)</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              <Bar dataKey="share" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
