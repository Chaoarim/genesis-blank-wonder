import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Trash2, Shield, Users, Eye, EyeOff, Loader2, Copy, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { SellerUser } from '@/hooks/useSellerPermissions';
import { ALL_PERMISSIONS } from '@/hooks/useSellerPermissions';

interface Props {
  sellers: SellerUser[];
  onRemoveSeller: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onSetPermissions: (sellerId: string, perms: string[]) => Promise<void>;
  onGetPermissions: (sellerId: string) => Promise<string[]>;
  onRefreshSellers: () => Promise<void>;
}

export function SellersManager({ sellers, onRemoveSeller, onToggleActive, onSetPermissions, onGetPermissions, onRefreshSellers }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [permSellerId, setPermSellerId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

  // Password reset state
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const waitForSellerToBeVisible = async (emailToCheck: string, sellerId?: string) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const query = supabase
        .from('seller_users')
        .select('id')
        .ilike('email', emailToCheck)
        .limit(1);

      const { data, error } = sellerId
        ? await query.eq('id', sellerId)
        : await query;

      if (!error && (data?.length ?? 0) > 0) {
        return true;
      }

      await wait(400);
    }

    return false;
  };

  const handleAdd = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password.trim()) {
      toast.error('Preencha nome, email e senha');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setAdding(true);

    try {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: normalizedEmail,
          password,
          full_name: normalizedName,
        },
      });

      if (res.error || !res.data?.success) {
        toast.error(res.data?.error || 'Erro ao criar conta do vendedor');
        return;
      }

      const isVisible = await waitForSellerToBeVisible(normalizedEmail, res.data?.seller_user_id as string | undefined);
      await onRefreshSellers();

      if (!isVisible) {
        toast.warning('Vendedor criado. Atualizando lista...');
      } else {
        toast.success('Vendedor cadastrado com sucesso!');
      }

      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      toast.error('Erro ao criar vendedor');
    } finally {
      setAdding(false);
    }
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };

  const startEditPassword = (seller: SellerUser) => {
    setEditingPasswordId(seller.id);
    setEditPasswordValue('');
  };

  const cancelEditPassword = () => {
    setEditingPasswordId(null);
    setEditPasswordValue('');
  };

  const savePassword = async (seller: SellerUser) => {
    if (!editPasswordValue.trim() || editPasswordValue.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSavingPassword(true);
    try {
      // Update auth password via edge function (re-register updates password)
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: seller.email,
          password: editPasswordValue,
          full_name: seller.name,
        },
      });

      if (res.error || !res.data?.success) {
        toast.error(res.data?.error || 'Erro ao atualizar senha');
        return;
      }

      await onRefreshSellers();
      toast.success('Senha atualizada com sucesso!');
      setEditingPasswordId(null);
      setEditPasswordValue('');
    } catch {
      toast.error('Erro ao atualizar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRemove = async (sellerId: string) => {
    if (!confirm('Remover vendedor?')) return;

    try {
      await onRemoveSeller(sellerId);
      toast.success('Vendedor removido com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover vendedor.');
    }
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
            <div className="relative min-w-[180px]">
              <Input
                placeholder="Senha de acesso"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={handleAdd} disabled={adding} className="shrink-0">
              {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            A conta será criada automaticamente. O vendedor faz login em <strong>/login</strong> com email e senha.
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
                <div key={seller.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {(seller as any).code && (
                          <Badge variant="outline" className="font-mono text-xs cursor-pointer" onClick={() => copyCode((seller as any).code)}>
                            {(seller as any).code}
                            <Copy className="w-3 h-3 ml-1" />
                          </Badge>
                        )}
                        <p className="font-medium truncate">{seller.name}</p>
                      </div>
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
                        void handleRemove(seller.id);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Password reset row */}
                  <div className="flex items-center gap-2 pl-1">
                    {editingPasswordId === seller.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-medium">Nova senha:</span>
                        <Input
                          value={editPasswordValue}
                          onChange={e => setEditPasswordValue(e.target.value)}
                          className="h-7 text-xs w-40"
                          placeholder="Nova senha (min. 6 chars)"
                          type="password"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600"
                          onClick={() => savePassword(seller)}
                          disabled={savingPassword}
                        >
                          {savingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditPassword}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => startEditPassword(seller)}
                      >
                        <Pencil className="w-3 h-3" />
                        Redefinir Senha
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
