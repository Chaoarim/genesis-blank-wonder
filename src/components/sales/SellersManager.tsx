import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { SellerUser } from '@/hooks/useSellerPermissions';
import { ALL_PERMISSIONS } from '@/hooks/useSellerPermissions';

interface Props {
  sellers: SellerUser[];
  onAddSeller: (data: { name: string; email: string }) => Promise<any>;
  onRemoveSeller: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onSetPermissions: (sellerId: string, perms: string[]) => Promise<void>;
  onGetPermissions: (sellerId: string) => Promise<string[]>;
}

export function SellersManager({ sellers, onAddSeller, onRemoveSeller, onToggleActive, onSetPermissions, onGetPermissions }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [permSellerId, setPermSellerId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) { toast.error('Preencha nome e email'); return; }
    setAdding(true);
    const result = await onAddSeller({ name: name.trim(), email: email.trim() });
    if (result) {
      toast.success('Vendedor adicionado!');
      setName('');
      setEmail('');
    } else {
      toast.error('Erro ao adicionar vendedor');
    }
    setAdding(false);
  };

  const openPermissions = async (seller: SellerUser) => {
    setPermSellerId(seller.id);
    const perms = await onGetPermissions(seller.id);
    setSelectedPerms(perms);
    setPermDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!permSellerId) return;
    await onSetPermissions(permSellerId, selectedPerms);
    toast.success('Permissões atualizadas!');
    setPermDialogOpen(false);
  };

  const togglePerm = (key: string) => {
    setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Adicionar Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Nome do vendedor" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Email (para login)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Button onClick={handleAdd} disabled={adding} className="shrink-0">
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            O vendedor precisará criar uma conta com este email para acessar a Central de Vendas.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Vendedores ({sellers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum vendedor cadastrado</p>
          ) : (
            <div className="space-y-3">
              {sellers.map(seller => (
                <div key={seller.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{seller.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{seller.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant={seller.is_active ? 'default' : 'secondary'}>
                      {seller.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Switch
                      checked={seller.is_active}
                      onCheckedChange={(v) => onToggleActive(seller.id, v)}
                    />
                    <Button variant="outline" size="icon" onClick={() => openPermissions(seller)} title="Permissões">
                      <Shield className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      if (confirm('Remover vendedor?')) onRemoveSeller(seller.id);
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissões do Vendedor
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "Nova Venda" está sempre habilitada. Selecione as áreas adicionais:
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {ALL_PERMISSIONS.map(p => (
              <label key={p.key} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted">
                <Checkbox
                  checked={selectedPerms.includes(p.key)}
                  onCheckedChange={() => togglePerm(p.key)}
                />
                <span className="text-sm">{p.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePermissions}>Salvar Permissões</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
