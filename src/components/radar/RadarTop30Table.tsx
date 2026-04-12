import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { getReputationBadge, getPriceIndication, type RadarMLItem } from '@/services/radarMLService';

interface Props {
  items: RadarMLItem[];
  precoMedio: number;
  freteGratis: boolean;
  reputacaoVerde: boolean;
}

export function RadarTop30Table({ items, precoMedio, freteGratis, reputacaoVerde }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...items];
    if (freteGratis) list = list.filter(i => i.shipping?.free_shipping);
    if (reputacaoVerde) {
      list = list.filter(i => (i.sold_quantity || 0) > 50);
    }
    return list.sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0)).slice(0, 30);
  }, [items, freteGratis, reputacaoVerde]);

  const maxSold = Math.max(...filtered.map(i => i.sold_quantity || 0), 1);

  const getMedal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a] overflow-hidden">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h3 className="text-lg font-bold">🏆 Top 30 Produtos Mais Vendidos</h3>
        <p className="text-sm text-[#9ca3af]">Ordenados por quantidade vendida no ML</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2a2a2a] hover:bg-transparent">
              <TableHead className="text-[#9ca3af] w-12">#</TableHead>
              <TableHead className="text-[#9ca3af] w-14">Foto</TableHead>
              <TableHead className="text-[#9ca3af]">Produto</TableHead>
              <TableHead className="text-[#9ca3af] text-right">Preço</TableHead>
              <TableHead className="text-[#9ca3af] text-right">Vendidos</TableHead>
              <TableHead className="text-[#9ca3af]">Vendedor</TableHead>
              <TableHead className="text-[#9ca3af]">Estado</TableHead>
              <TableHead className="text-[#9ca3af]">Frete</TableHead>
              <TableHead className="text-[#9ca3af] w-24">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item, idx) => {
              const expanded = expandedId === item.id;
              const discount = item.original_price && item.original_price > item.price
                ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
                : 0;
              const indication = getPriceIndication(item.price, precoMedio);

              return (
                <>
                  <TableRow key={item.id} className="border-[#2a2a2a] hover:bg-[#222]">
                    <TableCell className="font-bold text-center">{getMedal(idx)}</TableCell>
                    <TableCell>
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                        <img src={item.thumbnail?.replace('http:', 'https:') || '/placeholder.svg'} alt="" className="w-12 h-12 rounded object-cover" />
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] border-[#2a2a2a]">{item.condition === 'new' ? 'NOVO' : 'USADO'}</Badge>
                        {item.shipping?.free_shipping && <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">FRETE GRÁTIS</Badge>}
                        {discount > 0 && <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">-{discount}%</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-bold text-green-400">R$ {item.price.toFixed(2)}</p>
                      {item.original_price && item.original_price > item.price && (
                        <p className="text-xs text-[#9ca3af] line-through">R$ {item.original_price.toFixed(2)}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-bold">{(item.sold_quantity || 0).toLocaleString('pt-BR')}</p>
                      <Progress value={(item.sold_quantity || 0) / maxSold * 100} className="h-1 mt-1 bg-[#2a2a2a]" />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-blue-400 truncate max-w-[120px]">{item.seller?.nickname || '—'}</p>
                    </TableCell>
                    <TableCell className="text-xs text-[#9ca3af]">{item.address?.state_name || item.address?.state_id || '—'}</TableCell>
                    <TableCell>{item.shipping?.free_shipping ? '✅' : '💲'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="text-blue-400 h-7 px-2 text-xs">
                            <ExternalLink className="w-3 h-3 mr-1" /> ML
                          </Button>
                        </a>
                        <Button
                          size="sm" variant="ghost"
                          className="text-[#9ca3af] h-7 px-2 text-xs"
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                        >
                          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow key={`${item.id}-exp`} className="border-[#2a2a2a] bg-[#151515]">
                      <TableCell colSpan={9}>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-[#9ca3af]">Disponível</p>
                            <p className="font-medium">{item.available_quantity ?? '—'} un.</p>
                          </div>
                          <div>
                            <p className="text-[#9ca3af]">Parcelas</p>
                            <p className="font-medium">{item.installments ? `${item.installments.quantity}x R$ ${item.installments.amount?.toFixed(2)}` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[#9ca3af]">Indicação</p>
                            <p className={`font-medium ${indication.cor}`}>{indication.emoji} {indication.label}</p>
                          </div>
                          <div>
                            <p className="text-[#9ca3af]">Cidade</p>
                            <p className="font-medium">{item.address?.city_name || '—'}</p>
                          </div>
                          {item.attributes?.length > 0 && (
                            <div className="col-span-full">
                              <p className="text-[#9ca3af] mb-1">Atributos</p>
                              <div className="flex flex-wrap gap-1">
                                {item.attributes.slice(0, 8).map((a, ai) => (
                                  <Badge key={ai} variant="outline" className="text-[10px] border-[#2a2a2a]">
                                    {a.name}: {a.value_name || '—'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
