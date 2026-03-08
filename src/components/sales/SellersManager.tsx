import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Trash2, Shield, Users, Eye, EyeOff, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [permSellerId, setPermSellerId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

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
        body: { email: normalizedEmail, password, full_name: normalizedName },
      });

      if (res.error || !res.data?.success) {
        toast.error(res.data?.error || 'Erro ao criar conta do vendedor');
        return;
      }

      const authId = res.data.user_id as string | undefined;
      if (!authId) {
        toast.error('Conta criada sem ID de autenticação. Tente novamente.');
        return;
      }

      const [existingByEmailRes, existingByAuthRes] = await Promise.all([
        supabase
          .from('seller_users')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle(),
        supabase
          .from('seller_users')
          .select('id')
          .eq('seller_auth_id', authId)
          .maybeSingle(),
      ]);

      if (existingByEmailRes.error || existingByAuthRes.error) {
        toast.error('Erro ao validar vendedor existente. Tente novamente.');
        return;
      }

      const existingSellerId = existingByEmailRes.data?.id || existingByAuthRes.data?.id;

      if (existingSellerId) {
        const { error: updateExistingError } = await supabase
          .from('seller_users')
          .update({
            name: normalizedName,
            email: normalizedEmail,
            seller_auth_id: authId,
            is_active: true,
          })
          .eq('id', existingSellerId);

        if (updateExistingError) {
          toast.error('Não foi possível atualizar o vendedor existente.');
          return;
        }

        toast.success('Vendedor já existia e foi atualizado com sucesso!');
        setName('');
        setEmail('');
        setPassword('');
        return;
      }

      const result = await onAddSeller({ name: normalizedName, email: normalizedEmail });
      if (!result) {
        toast.error('Não foi possível cadastrar vendedor. Verifique se ele já existe.');
        return;
      }

      const { error: linkError } = await supabase
        .from('seller_users')
        .update({ seller_auth_id: authId })
        .eq('id', result.id);

      if (linkError) {
        toast.error('Conta criada, mas falhou ao vincular vendedor. Tente novamente.');
        return;
      }

      toast.success('Vendedor criado com sucesso!');
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
                <div key={seller.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
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
