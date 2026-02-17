import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Search, Package, MessageSquare } from 'lucide-react';
import { Part } from '@/hooks/usePartsDatabase';
import { SupplierQuickSearch } from './SupplierQuickSearch';

interface CatalogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parts: Part[];
  onConsultAI?: (supplierName: string) => void;
}

interface SupplierInfo {
  name: string;
  count: number;
  description: string;
}

function getSupplierDescription(parts: Part[], supplierName: string): string {
  const supplierParts = parts.filter(
    p => p.fornecedor.trim().toUpperCase() === supplierName
  );
  const productTypes = new Set<string>();
  for (const p of supplierParts.slice(0, 200)) {
    const produto = p.produto.trim();
    if (produto) {
      // Get first meaningful words of product
      const words = produto.split(/\s+/).slice(0, 3).join(' ');
      if (words.length > 2) productTypes.add(words.toLowerCase());
    }
  }
  const unique = [...productTypes].slice(0, 5);
  return unique.length > 0
    ? unique.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') + '...'
    : '';
}

export function CatalogsDialog({ open, onOpenChange, parts, onConsultAI }: CatalogsDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const suppliers: SupplierInfo[] = useMemo(() => {
    const supplierMap = new Map<string, number>();

    parts.forEach(part => {
      const supplier = part.fornecedor.trim().toUpperCase();
      if (supplier) {
        supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + 1);
      }
    });

    return Array.from(supplierMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        description: getSupplierDescription(parts, name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parts]);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const searchLower = search.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(searchLower));
  }, [suppliers, search]);

  const handleConsultAI = (supplierName: string) => {
    if (onConsultAI) {
      onConsultAI(supplierName);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open && !selectedSupplier} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="w-5 h-5 text-primary" />
              Catálogos por Fornecedor
              <span className="text-sm font-normal text-muted-foreground">
                ({suppliers.length} fornecedores)
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[70vh]">
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.name}
                  className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 transition-colors overflow-hidden"
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {supplier.name.substring(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.count.toLocaleString()} peças
                        </p>
                      </div>
                    </div>
                    {supplier.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {supplier.description}
                      </p>
                    )}
                  </div>

                  <div className="px-4 pb-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => setSelectedSupplier(supplier.name)}
                    >
                      <Package className="w-3.5 h-3.5 mr-1" />
                      Consulta rápida
                    </Button>
                  </div>
                </div>
              ))}

              {filteredSuppliers.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Nenhum fornecedor encontrado
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <SupplierQuickSearch
        open={!!selectedSupplier}
        onOpenChange={(v) => !v && setSelectedSupplier(null)}
        supplierName={selectedSupplier || ''}
        parts={parts}
      />
    </>
  );
}
