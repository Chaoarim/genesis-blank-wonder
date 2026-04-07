import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench, Clock, AlertTriangle, Shield, Cog, Droplets } from 'lucide-react';

interface FleetRanking {
  id: string;
  year: number;
  position: number;
  model: string;
  quantity: number;
  vehicle_type: string;
}

interface Props {
  top10: FleetRanking[];
  selectedYear: string;
}

interface MaintenanceCategory {
  category: string;
  icon: React.ReactNode;
  kmInterval: string;
  description: string;
  priority: 'alta' | 'media' | 'baixa';
  examples: string[];
}

const CURRENT_YEAR = new Date().getFullYear();

// Categories based on vehicle age (years since the ranking year)
function getMaintenanceCategories(fleetAge: number): MaintenanceCategory[] {
  const categories: MaintenanceCategory[] = [];

  // All ages: consumables
  categories.push({
    category: 'Filtros e Lubrificação',
    icon: <Droplets className="w-4 h-4 text-blue-500" />,
    kmInterval: '10.000 - 15.000 km',
    description: 'Manutenção periódica obrigatória',
    priority: 'alta',
    examples: ['Filtro de óleo', 'Filtro de ar', 'Filtro de combustível', 'Filtro de cabine'],
  });

  if (fleetAge >= 2) {
    categories.push({
      category: 'Freios',
      icon: <Shield className="w-4 h-4 text-red-500" />,
      kmInterval: '30.000 - 50.000 km',
      description: 'Desgaste natural das pastilhas e discos',
      priority: 'alta',
      examples: ['Pastilha de freio', 'Disco de freio', 'Fluido de freio', 'Lonas de freio'],
    });
  }

  if (fleetAge >= 3) {
    categories.push({
      category: 'Suspensão e Direção',
      icon: <Cog className="w-4 h-4 text-amber-500" />,
      kmInterval: '40.000 - 80.000 km',
      description: 'Componentes sujeitos a desgaste por rodagem',
      priority: 'alta',
      examples: ['Amortecedor', 'Pivô', 'Terminal de direção', 'Bucha da bandeja', 'Bieleta'],
    });
  }

  if (fleetAge >= 4) {
    categories.push({
      category: 'Correia e Tensor',
      icon: <Wrench className="w-4 h-4 text-purple-500" />,
      kmInterval: '50.000 - 100.000 km',
      description: 'Troca preventiva para evitar quebra do motor',
      priority: 'alta',
      examples: ['Correia dentada', 'Correia poly-V', 'Tensor da correia', 'Bomba d\'água'],
    });
  }

  if (fleetAge >= 5) {
    categories.push({
      category: 'Embreagem',
      icon: <Cog className="w-4 h-4 text-orange-500" />,
      kmInterval: '60.000 - 120.000 km',
      description: 'Alta demanda em veículos urbanos',
      priority: 'media',
      examples: ['Kit embreagem', 'Platô', 'Disco de embreagem', 'Rolamento'],
    });
  }

  if (fleetAge >= 6) {
    categories.push({
      category: 'Arrefecimento',
      icon: <Droplets className="w-4 h-4 text-cyan-500" />,
      kmInterval: '80.000 - 120.000 km',
      description: 'Mangueiras e componentes ressecam com o tempo',
      priority: 'media',
      examples: ['Radiador', 'Mangueiras', 'Válvula termostática', 'Ventoinha'],
    });
  }

  if (fleetAge >= 8) {
    categories.push({
      category: 'Motor e Elétrica',
      icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
      kmInterval: '100.000+ km',
      description: 'Componentes com vida útil esgotando',
      priority: 'media',
      examples: ['Bobina de ignição', 'Velas', 'Motor de partida', 'Alternador', 'Sonda lambda'],
    });
  }

  if (fleetAge >= 10) {
    categories.push({
      category: 'Retífica e Câmbio',
      icon: <Wrench className="w-4 h-4 text-red-700" />,
      kmInterval: '150.000+ km',
      description: 'Revisão pesada para veículos com alta quilometragem',
      priority: 'baixa',
      examples: ['Kit retífica', 'Junta do cabeçote', 'Reparo do câmbio', 'Bieleta do câmbio'],
    });
  }

  return categories;
}

function getPriorityColor(priority: string) {
  if (priority === 'alta') return 'bg-red-500/10 text-red-700 dark:text-red-400';
  if (priority === 'media') return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'bg-muted text-muted-foreground';
}

export function MaintenanceCycleTab({ top10, selectedYear }: Props) {
  const yearNum = Number(selectedYear) || CURRENT_YEAR;
  const fleetAge = CURRENT_YEAR - yearNum;

  const categories = useMemo(() => getMaintenanceCategories(fleetAge), [fleetAge]);

  const modelSummary = useMemo(() => {
    return top10.map(r => ({
      ...r,
      age: fleetAge,
      totalCategories: categories.length,
    }));
  }, [top10, fleetAge, categories]);

  return (
    <div className="space-y-4">
      {/* Age info */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3 flex-wrap">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">
              Frota de {selectedYear} → Idade: <span className="text-primary">{fleetAge} anos</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Veículos emplacados em {selectedYear} estão com ~{(fleetAge * 15000).toLocaleString('pt-BR')} km rodados (estimativa 15.000 km/ano).
              Isso gera demanda por <strong>{categories.length} categorias</strong> de peças.
            </p>
          </div>
        </div>
      </Card>

      {/* Categories table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Wrench className="w-4 h-4 text-primary" />
            Ciclo de Manutenção — Peças em Demanda para Frota {selectedYear}
          </h3>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead>Exemplos de Peças</TableHead>
                <TableHead>Prioridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-sm">
                      {cat.icon}
                      {cat.category}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{cat.kmInterval}</TableCell>
                  <TableCell className="text-xs max-w-[200px]">{cat.description}</TableCell>
                  <TableCell className="text-xs max-w-[250px]">
                    <div className="flex flex-wrap gap-1">
                      {cat.examples.map((ex, j) => (
                        <Badge key={j} variant="outline" className="text-[10px] px-1.5 py-0">
                          {ex}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${getPriorityColor(cat.priority)}`}>
                      {cat.priority === 'alta' ? '🔴 Alta' : cat.priority === 'media' ? '🟡 Média' : '🟢 Baixa'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Models + categories summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">
          Top 10 Modelos × Oportunidade de Manutenção ({selectedYear})
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Estes veículos com {fleetAge} anos de uso precisam das {categories.length} categorias acima. 
          Quanto maior a frota, maior o volume potencial de vendas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {modelSummary.map(m => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-muted-foreground w-6">{m.position}°</span>
                <span className="text-sm font-medium truncate">{m.model}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{m.quantity.toLocaleString('pt-BR')} un.</span>
                <Badge variant="secondary" className="text-[10px]">{m.totalCategories} categorias</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
