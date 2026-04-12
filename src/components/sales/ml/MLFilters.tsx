import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Filter, X } from 'lucide-react';
import { ML_STATES } from '@/services/mercadolivreService';

export interface MLFilterValues {
  estado: string;
  precoMin: number;
  precoMax: number;
  reputacao: string;
  modelo: string;
  fabricante: string;
}

const REPUTACAO_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'green', label: '🟢 Ótimo' },
  { value: 'yellow', label: '🟡 Bom' },
  { value: 'red', label: '🔴 Ruim' },
];

interface MLFiltersProps {
  filters: MLFilterValues;
  onChange: (filters: MLFilterValues) => void;
  maxPrice: number;
}

export const INITIAL_FILTERS: MLFilterValues = {
  estado: 'all',
  precoMin: 0,
  precoMax: 99999,
  reputacao: 'all',
  modelo: '',
  fabricante: '',
};

export function MLFilters({ filters, onChange, maxPrice }: MLFiltersProps) {
  const [open, setOpen] = useState(false);

  const hasActive =
    filters.estado !== 'all' ||
    filters.reputacao !== 'all' ||
    filters.modelo.trim() !== '' ||
    filters.fabricante.trim() !== '' ||
    filters.precoMin > 0 ||
    filters.precoMax < maxPrice;

  const activeCount = [
    filters.estado !== 'all',
    filters.reputacao !== 'all',
    filters.modelo.trim() !== '',
    filters.fabricante.trim() !== '',
    filters.precoMin > 0 || filters.precoMax < maxPrice,
  ].filter(Boolean).length;

  const update = (partial: Partial<MLFilterValues>) => onChange({ ...filters, ...partial });

  const clearAll = () => onChange({ ...INITIAL_FILTERS, precoMax: maxPrice });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={open ? 'default' : 'outline'}
          onClick={() => setOpen(!open)}
          className="h-8 text-xs gap-1"
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
        {hasActive && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="h-8 text-xs gap-1 text-muted-foreground">
            <X className="w-3 h-3" /> Limpar
          </Button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-3 rounded-lg border border-border bg-card">
          {/* Estado */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Região/Estado</label>
            <Select value={filters.estado} onValueChange={(v) => update({ estado: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os estados</SelectItem>
                {ML_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reputação */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Reputação Vendedor</label>
            <Select value={filters.reputacao} onValueChange={(v) => update({ reputacao: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPUTACAO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modelo */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Buscar modelo</label>
            <Input
              placeholder="Ex: Gol, Civic..."
              value={filters.modelo}
              onChange={(e) => update({ modelo: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          {/* Fabricante */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Fabricante</label>
            <Input
              placeholder="Ex: Bosch, Mahle..."
              value={filters.fabricante}
              onChange={(e) => update({ fabricante: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          {/* Faixa de Preço */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase">
              Faixa de Preço: R$ {filters.precoMin.toLocaleString('pt-BR')} – R$ {filters.precoMax.toLocaleString('pt-BR')}
            </label>
            <Slider
              min={0}
              max={maxPrice || 1000}
              step={10}
              value={[filters.precoMin, filters.precoMax]}
              onValueChange={([min, max]) => update({ precoMin: min, precoMax: max })}
              className="mt-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}
