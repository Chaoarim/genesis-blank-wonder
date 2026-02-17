import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Search, ChevronRight, Package } from 'lucide-react';
import { Part } from '@/hooks/usePartsDatabase';
import { SupplierQuickSearch } from './SupplierQuickSearch';

interface CatalogsSheetProps {
  parts: Part[];
  disabled?: boolean;
}

export function CatalogsSheet({ parts, disabled }: CatalogsSheetProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  // Extract unique suppliers and count parts per supplier
  const suppliers = useMemo(() => {
    const supplierMap = new Map<string, number>();
    
    parts.forEach(part => {
      const supplier = part.fornecedor.trim().toUpperCase();
      if (supplier) {
        supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + 1);
      }
    });

    return Array.from(supplierMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parts]);

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const searchLower = search.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(searchLower));
  }, [suppliers, search]);

  const handleSupplierClick = (supplierName: string) => {
    setSelectedSupplier(supplierName);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={disabled}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Consulta rápida
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Catálogos por Fornecedor
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>{suppliers.length} fornecedores disponíveis</span>
            </div>

            {/* Suppliers list */}
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-1 pr-4">
                {filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.name}
                    onClick={() => handleSupplierClick(supplier.name)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-card border text-left hover:bg-accent hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {supplier.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplier.count.toLocaleString()} peças
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}

                {filteredSuppliers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum fornecedor encontrado
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <SupplierQuickSearch
        open={!!selectedSupplier}
        onOpenChange={(open) => !open && setSelectedSupplier(null)}
        supplierName={selectedSupplier || ''}
        parts={parts}
      />
    </>
  );
}
