import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Plus, RefreshCw, Pencil, Trash2, Package, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  local: string;
  codigo: string;
  marca: string;
  descricao: string;
  qtde: number;
  preco_sama: number | null;
  preco_real: number | null;
  preco_dpk: number | null;
  roles_dpk: string | null;
  melhor_preco: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  local: string;
  codigo: string;
  marca: string;
  descricao: string;
  qtde: number;
  preco_sama: string;
  preco_real: string;
  preco_dpk: string;
  roles_dpk: string;
  melhor_preco: string;
}

const initialFormData: ProductFormData = {
  local: "",
  codigo: "",
  marca: "",
  descricao: "",
  qtde: 1,
  preco_sama: "",
  preco_real: "",
  preco_dpk: "",
  roles_dpk: "",
  melhor_preco: "",
};

const MELHOR_PRECO_OPTIONS = [
  { value: "", label: "Nenhum" },
  { value: "real", label: "Preço Real" },
  { value: "dpk", label: "Preço Dpk" },
  { value: "roles", label: "Preço Roles" },
];

export const PriceComparisonProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [samaDate, setSamaDate] = useState<Date | undefined>(() => {
    const saved = localStorage.getItem('sama_price_date');
    return saved ? new Date(saved) : new Date();
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (samaDate) {
      localStorage.setItem('sama_price_date', samaDate.toISOString());
    }
  }, [samaDate]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("price_comparison_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        local: product.local,
        codigo: product.codigo,
        marca: product.marca,
        descricao: product.descricao,
        qtde: product.qtde,
        preco_sama: product.preco_sama?.toString() || "",
        preco_real: product.preco_real?.toString() || "",
        preco_dpk: product.preco_dpk?.toString() || "",
        roles_dpk: product.roles_dpk || "",
        melhor_preco: product.melhor_preco || "",
      });
    } else {
      setEditingProduct(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const productData = {
      local: formData.local.trim(),
      codigo: formData.codigo.trim(),
      marca: formData.marca.trim(),
      descricao: formData.descricao.trim(),
      qtde: formData.qtde,
      preco_sama: formData.preco_sama ? parseFloat(formData.preco_sama) : null,
      preco_real: formData.preco_real ? parseFloat(formData.preco_real) : null,
      preco_dpk: formData.preco_dpk ? parseFloat(formData.preco_dpk) : null,
      roles_dpk: formData.roles_dpk.trim() || null,
      melhor_preco: formData.melhor_preco || null,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("price_comparison_products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("price_comparison_products")
          .insert(productData);

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }

      handleCloseDialog();
      fetchProducts();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("price_comparison_products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;
      toast.success("Produto excluído com sucesso!");
      fetchProducts();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className="p-6 glass-card">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Produtos - Comparação de Preços
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Preços Sama cadastrados em:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 justify-start text-left font-normal",
                      !samaDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {samaDate ? format(samaDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={samaDate}
                    onSelect={setSamaDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="local">Local</Label>
                    <Input
                      id="local"
                      value={formData.local}
                      onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                      required
                      placeholder="Ex: Prateleira A1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                      placeholder="Ex: 12345"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input
                      id="marca"
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      required
                      placeholder="Ex: Bosch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtde">Quantidade</Label>
                    <Input
                      id="qtde"
                      type="number"
                      min="1"
                      value={formData.qtde}
                      onChange={(e) => setFormData({ ...formData, qtde: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    placeholder="Ex: Pastilha de freio dianteira"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco_sama">Preço Sama (R$)</Label>
                    <Input
                      id="preco_sama"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_sama}
                      onChange={(e) => setFormData({ ...formData, preco_sama: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preco_real">Preço Real (R$)</Label>
                    <Input
                      id="preco_real"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_real}
                      onChange={(e) => setFormData({ ...formData, preco_real: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preco_dpk">Preço Dpk (R$)</Label>
                    <Input
                      id="preco_dpk"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_dpk}
                      onChange={(e) => setFormData({ ...formData, preco_dpk: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roles_dpk">Preço Roles (R$)</Label>
                  <Input
                    id="roles_dpk"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.roles_dpk}
                    onChange={(e) => setFormData({ ...formData, roles_dpk: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="melhor_preco">Destacar Melhor Preço</Label>
                  <Select
                    value={formData.melhor_preco || "none"}
                    onValueChange={(value) => setFormData({ ...formData, melhor_preco: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o melhor preço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="real">Preço Real</SelectItem>
                      <SelectItem value="dpk">Preço Dpk</SelectItem>
                      <SelectItem value="roles">Preço Roles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : editingProduct ? (
                      "Atualizar"
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Local</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Qtde</TableHead>
              <TableHead className="text-right">Preço Sama</TableHead>
              <TableHead className="text-right">Preço Real</TableHead>
              <TableHead className="text-right">Preço Dpk</TableHead>
              <TableHead className="text-right">Preço Roles</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const rolesValue = product.roles_dpk ? parseFloat(product.roles_dpk) : null;
                const bestPrice = product.melhor_preco;
                
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.local}</TableCell>
                    <TableCell className="font-mono">{product.codigo}</TableCell>
                    <TableCell>{product.marca}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{product.descricao}</TableCell>
                    <TableCell className="text-center">{product.qtde}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(product.preco_sama)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${bestPrice === 'real' ? 'bg-green-500/20 text-green-600 dark:text-green-400 font-bold rounded' : ''}`}>
                      {formatCurrency(product.preco_real)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${bestPrice === 'dpk' ? 'bg-green-500/20 text-green-600 dark:text-green-400 font-bold rounded' : ''}`}>
                      {formatCurrency(product.preco_dpk)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${bestPrice === 'roles' ? 'bg-green-500/20 text-green-600 dark:text-green-400 font-bold rounded' : ''}`}>
                      {rolesValue ? formatCurrency(rolesValue) : "-"}
                    </TableCell>
                    <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o produto <strong>{product.codigo}</strong> - {product.descricao}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
