import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Car, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PopularCar {
  id: string;
  name: string;
}

interface CarPart {
  fornecedor: string | null;
  fabricante: string | null;
  produto: string | null;
  aplicacao: string | null;
}

export function PopularCarsMenu() {
  const [cars, setCars] = useState<PopularCar[]>([]);
  const [selectedCar, setSelectedCar] = useState<PopularCar | null>(null);
  const [parts, setParts] = useState<CarPart[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("popular_cars")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => setCars(data || []));
  }, []);

  const openCarParts = async (car: PopularCar) => {
    setSelectedCar(car);
    setLoading(true);
    const { data } = await supabase
      .from("popular_car_parts")
      .select("fornecedor, fabricante, produto, aplicacao")
      .eq("car_id", car.id);
    setParts((data as CarPart[]) || []);
    setLoading(false);
  };

  if (cars.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Mais Vendidos</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {cars.map(car => (
            <DropdownMenuItem key={car.id} onClick={() => openCarParts(car)}>
              {car.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!selectedCar} onOpenChange={open => !open && setSelectedCar(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Peças — {selectedCar?.name}
            </DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : parts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma peça cadastrada para este veículo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Aplicação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{p.fornecedor}</TableCell>
                    <TableCell className="text-sm">{p.fabricante}</TableCell>
                    <TableCell className="text-sm">{p.produto}</TableCell>
                    <TableCell className="text-sm">{p.aplicacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
