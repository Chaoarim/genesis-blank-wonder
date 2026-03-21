import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Car, ArrowUp, ArrowDown, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PopularCar {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

interface LinkedPart {
  id: string;
  fornecedor: string;
  fabricante: string;
  produto: string;
  aplicacao: string;
}

export function PopularCarsManager() {
  const [cars, setCars] = useState<PopularCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCarName, setNewCarName] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [linkedParts, setLinkedParts] = useState<LinkedPart[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // New part form
  const [newFornecedor, setNewFornecedor] = useState("");
  const [newFabricante, setNewFabricante] = useState("");
  const [newProduto, setNewProduto] = useState("");
  const [newAplicacao, setNewAplicacao] = useState("");
  const [newSimilares, setNewSimilares] = useState("");
  const [addingPart, setAddingPart] = useState(false);

  // Edit state
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editFornecedor, setEditFornecedor] = useState("");
  const [editFabricante, setEditFabricante] = useState("");
  const [editProduto, setEditProduto] = useState("");
  const [editAplicacao, setEditAplicacao] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchCars();
  }, []);

  useEffect(() => {
    if (selectedCarId) fetchLinkedParts(selectedCarId);
  }, [selectedCarId]);

  const fetchCars = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("popular_cars")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast.error("Erro ao carregar carros");
    else setCars(data || []);
    setLoading(false);
  };

  const addCar = async () => {
    if (!newCarName.trim()) return;
    setAdding(true);
    const maxOrder = cars.length > 0 ? Math.max(...cars.map(c => c.display_order)) + 1 : 0;
    const { error } = await supabase
      .from("popular_cars")
      .insert({ name: newCarName.trim(), display_order: maxOrder });
    if (error) toast.error("Erro ao adicionar carro");
    else {
      toast.success("Carro adicionado!");
      setNewCarName("");
      fetchCars();
    }
    setAdding(false);
  };

  const deleteCar = async (id: string) => {
    // Excluir as peças vinculadas para evitar erro de violação de chave estrangeira (FK Constraint)
    const { error: partsError } = await supabase.from("popular_car_parts").delete().eq("car_id", id);
    if (partsError) {
      toast.error("Erro ao excluir peças deste catálogo");
      return;
    }

    const { error } = await supabase.from("popular_cars").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir catálogo");
    else {
      toast.success("Catálogo excluído!");
      if (selectedCarId === id) setSelectedCarId(null);
      fetchCars();
    }
  };

  const moveOrder = async (id: string, direction: "up" | "down") => {
    const idx = cars.findIndex(c => c.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === cars.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updates = [
      supabase.from("popular_cars").update({ display_order: cars[swapIdx].display_order }).eq("id", cars[idx].id),
      supabase.from("popular_cars").update({ display_order: cars[idx].display_order }).eq("id", cars[swapIdx].id),
    ];
    await Promise.all(updates);
    fetchCars();
  };

  const fetchLinkedParts = async (carId: string) => {
    setLoadingParts(true);
    const { data, error } = await supabase
      .from("popular_car_parts")
      .select("id, fornecedor, fabricante, produto, aplicacao")
      .eq("car_id", carId);
    if (error) toast.error("Erro ao carregar peças");
    else setLinkedParts((data as LinkedPart[]) || []);
    setLoadingParts(false);
  };

  const addPart = async () => {
    if (!selectedCarId || !newProduto.trim()) return;
    setAddingPart(true);
    const { error } = await supabase
      .from("popular_car_parts")
      .insert({
        car_id: selectedCarId,
        fornecedor: newFornecedor.trim() || null,
        fabricante: newFabricante.trim() || null,
        produto: newProduto.trim(),
        aplicacao: (newAplicacao.trim() + (newSimilares.trim() ? ` | Similares: ${newSimilares.trim()}` : '')).trim() || null,
      });
    if (error) toast.error("Erro ao adicionar peça");
    else {
      toast.success("Peça adicionada!");
      setNewFornecedor("");
      setNewFabricante("");
      setNewProduto("");
      setNewAplicacao("");
      setNewSimilares("");
      fetchLinkedParts(selectedCarId);
    }
    setAddingPart(false);
  };

  const deletePart = async (linkId: string) => {
    const { error } = await supabase.from("popular_car_parts").delete().eq("id", linkId);
    if (error) toast.error("Erro ao remover peça");
    else {
      toast.success("Peça removida!");
      if (selectedCarId) fetchLinkedParts(selectedCarId);
    }
  };

  const startEdit = (part: LinkedPart) => {
    setEditingPartId(part.id);
    setEditFornecedor(part.fornecedor || "");
    setEditFabricante(part.fabricante || "");
    setEditProduto(part.produto || "");
    setEditAplicacao(part.aplicacao || "");
  };

  const cancelEdit = () => setEditingPartId(null);

  const saveEdit = async () => {
    if (!editingPartId || !editProduto.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("popular_car_parts")
      .update({
        fornecedor: editFornecedor.trim() || null,
        fabricante: editFabricante.trim() || null,
        produto: editProduto.trim(),
        aplicacao: editAplicacao.trim() || null,
      })
      .eq("id", editingPartId);
    if (error) toast.error("Erro ao salvar edição");
    else {
      toast.success("Peça atualizada!");
      setEditingPartId(null);
      if (selectedCarId) fetchLinkedParts(selectedCarId);
    }
    setSavingEdit(false);
  };

  return (
    <div className="space-y-6">
      {/* Add car */}
      <Card className="p-6 glass-card">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Car className="w-5 h-5 text-primary" />
          Catálogos por Veículo
        </h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nome do carro (ex: Gol G5)"
            value={newCarName}
            onChange={e => setNewCarName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCar()}
          />
          <Button onClick={addCar} disabled={adding || !newCarName.trim()}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Adicionar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : cars.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum carro cadastrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cars.map((car, idx) => (
                <TableRow
                  key={car.id}
                  className={`cursor-pointer ${selectedCarId === car.id ? "bg-primary/10" : ""}`}
                  onClick={() => setSelectedCarId(car.id)}
                >
                  <TableCell className="w-24">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); moveOrder(car.id, "up"); }} disabled={idx === 0}>
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); moveOrder(car.id, "down"); }} disabled={idx === cars.length - 1}>
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{car.name}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={e => { e.stopPropagation(); deleteCar(car.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Parts for selected car */}
      {selectedCarId && (
        <Card className="p-6 glass-card">
          <h3 className="text-lg font-bold mb-4">
            Cadastrar Peça Manualmente para {cars.find(c => c.id === selectedCarId)?.name}
          </h3>

          {/* Add part form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
            <Input placeholder="Código *" value={newFabricante} onChange={e => setNewFabricante(e.target.value)} />
            <Input placeholder="Produto *" value={newProduto} onChange={e => setNewProduto(e.target.value)} />
            <Input placeholder="Fornecedor" value={newFornecedor} onChange={e => setNewFornecedor(e.target.value)} />
            <Input placeholder="Aplicação" value={newAplicacao} onChange={e => setNewAplicacao(e.target.value)} />
            <Input placeholder="Códigos Similares" value={newSimilares} onChange={e => setNewSimilares(e.target.value)} title="Será incluído junto à Aplicação" />
          </div>
          <Button onClick={addPart} disabled={addingPart || !newProduto.trim() || !newFabricante.trim()} className="mb-4">
            {addingPart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Adicionar Peça
          </Button>

          {/* Listed parts */}
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Peças cadastradas ({linkedParts.length})</h4>
          {loadingParts ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : linkedParts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma peça cadastrada. Use o formulário acima.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Aplicação / Similares</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedParts.map(lp => (
                  <TableRow key={lp.id}>
                    {editingPartId === lp.id ? (
                      <>
                        <TableCell><Input value={editFabricante} onChange={e => setEditFabricante(e.target.value)} className="h-8 text-sm" placeholder="Código" /></TableCell>
                        <TableCell><Input value={editProduto} onChange={e => setEditProduto(e.target.value)} className="h-8 text-sm" placeholder="Produto" /></TableCell>
                        <TableCell><Input value={editFornecedor} onChange={e => setEditFornecedor(e.target.value)} className="h-8 text-sm" placeholder="Fornecedor" /></TableCell>
                        <TableCell><Input value={editAplicacao} onChange={e => setEditAplicacao(e.target.value)} className="h-8 text-sm" placeholder="Aplicação" /></TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={saveEdit} disabled={savingEdit || !editProduto.trim()}>
                              {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-primary" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>
                              <X className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-sm">{lp.fabricante}</TableCell>
                        <TableCell className="text-sm">{lp.produto}</TableCell>
                        <TableCell className="text-sm">{lp.fornecedor}</TableCell>
                        <TableCell className="text-sm">{lp.aplicacao}</TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(lp)}>
                              <Pencil className="w-3 h-3 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deletePart(lp.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
