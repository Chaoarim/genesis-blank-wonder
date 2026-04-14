import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SellerUser {
  id: string;
  admin_user_id: string;
  seller_auth_id: string | null;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  
}

export interface SellerPermission {
  id: string;
  seller_user_id: string;
  permission: string;
  created_at: string;
}

// All available permissions (tab names in SalesHub)
export const ALL_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard', sensitive: false },
  { key: 'orders', label: 'Pedidos', sensitive: false },
  { key: 'inventory', label: 'Estoque', sensitive: false },
  { key: 'low-stock', label: 'Estoque Baixo', sensitive: false },
  { key: 'history', label: 'Histórico', sensitive: false },
  { key: 'customers', label: 'Clientes', sensitive: false },
  { key: 'carteira', label: 'Carteira de Clientes', sensitive: false },
  { key: 'fleet-rankings', label: 'Ranking Frota', sensitive: false },
  { key: 'credit', label: 'Aprovações de Crédito', sensitive: true },
  { key: 'repurchase-alerts', label: 'Alertas de Recompra', sensitive: false },
  { key: 'goals', label: 'Metas', sensitive: false },
  { key: 'markup', label: 'Markup', sensitive: true },
  { key: 'import-inventory', label: 'Importar Estoque', sensitive: true },
  { key: 'manual-product', label: 'Cadastrar Produto', sensitive: false },
  { key: 'promotions', label: 'Ofertas', sensitive: false },
  { key: 'coupons', label: 'Cupons', sensitive: true },
  { key: 'payment-terms', label: 'Prazos de Pagamento', sensitive: true },
  { key: 'sellers', label: 'Vendedores', sensitive: true },
  { key: 'commissions', label: 'Comissões', sensitive: true },
  { key: 'report', label: 'Relatório', sensitive: false },
  { key: 'accounts-payable', label: 'Contas a Pagar', sensitive: true },
  { key: 'abc-curve', label: 'Curva ABC', sensitive: true },
  { key: 'supplier-contacts', label: 'Fornecedores', sensitive: false },
  { key: 'warranty', label: 'Garantia/Devoluções', sensitive: false },
] as const;

export function useSellerPermissions(userId: string | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sellerRecord, setSellerRecord] = useState<SellerUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [sellers, setSellers] = useState<SellerUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsAdmin(false);
      setSellerRecord(null);
      setPermissions([]);
      setSellers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1) Check if current user is an active seller linked to an admin
    const { data: sellerData, error: sellerError } = await supabase
      .from('seller_users')
      .select('*')
      .eq('seller_auth_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (sellerError) {
      console.error('Erro ao buscar vendedor:', sellerError.message);
    }

    if (sellerData) {
      setIsAdmin(false);
      setSellerRecord(sellerData as SellerUser);

      const [permsRes, sellersRes] = await Promise.all([
        supabase.from('seller_permissions').select('*').eq('seller_user_id', sellerData.id),
        supabase.from('seller_users').select('*').eq('admin_user_id', sellerData.admin_user_id).order('name'),
      ]);

      setPermissions((permsRes.data || []).map((p: any) => p.permission));
      setSellers((sellersRes.data || []).map((s: any) => ({ ...s } as SellerUser)));
      setLoading(false);
      return;
    }

    // 2) Not a seller — treat as admin/owner of their own sales hub
    // Any authenticated user who is not a seller gets full access to all modules
    setIsAdmin(true);
    setSellerRecord(null);
    setPermissions([]);

    const { data: sellersData } = await supabase
      .from('seller_users')
      .select('*')
      .eq('admin_user_id', userId)
      .order('name');

    setSellers((sellersData || []).map((s: any) => ({ ...s } as SellerUser)));

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasPermission = useCallback((tab: string) => {
    if (isAdmin) return true;

    // Core tabs always available for sellers (individual operation + visibility)
    if (['new-sale', 'dashboard', 'history', 'report', 'carteira', 'help', 'fleet-rankings', 'saved-quotes'].includes(tab)) return true;

    return permissions.includes(tab);
  }, [isAdmin, permissions]);

  // Admin functions
  const addSeller = useCallback(async (data: { name: string; email: string }) => {
    if (!userId) return null;
    const { data: row, error } = await supabase
      .from('seller_users')
      .insert({ admin_user_id: userId, name: data.name, email: data.email })
      .select()
      .single();
    if (error) return null;
    setSellers(prev => [...prev, row as SellerUser]);
    return row;
  }, [userId]);

  const removeSeller = useCallback(async (id: string) => {
    const { error: permsError } = await supabase
      .from('seller_permissions')
      .delete()
      .eq('seller_user_id', id);

    if (permsError) {
      console.error('Erro ao remover permissões do vendedor:', permsError.message);
      throw new Error('Não foi possível remover as permissões do vendedor.');
    }

    const { error: deleteError } = await supabase
      .from('seller_users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao remover vendedor:', deleteError.message);
      throw new Error('Não foi possível remover vendedor.');
    }

    setSellers(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleSellerActive = useCallback(async (id: string, active: boolean) => {
    await supabase.from('seller_users').update({ is_active: active }).eq('id', id);
    setSellers(prev => prev.map(s => s.id === id ? { ...s, is_active: active } : s));
  }, []);

  const setSellerPermissions = useCallback(async (sellerId: string, perms: string[]) => {
    // Delete all existing then insert new
    await supabase.from('seller_permissions').delete().eq('seller_user_id', sellerId);
    if (perms.length > 0) {
      await supabase.from('seller_permissions').insert(
        perms.map(p => ({ seller_user_id: sellerId, permission: p }))
      );
    }
  }, []);

  const getSellerPermissions = useCallback(async (sellerId: string) => {
    const { data } = await supabase
      .from('seller_permissions')
      .select('permission')
      .eq('seller_user_id', sellerId);
    return (data || []).map((p: any) => p.permission);
  }, []);

  // Effective user ID: admin's ID for sellers, own ID for admins
  const adminUserId = isAdmin ? userId : (sellerRecord ? sellerRecord.admin_user_id : null);

  return {
    isAdmin,
    sellerRecord,
    permissions,
    sellers,
    loading,
    adminUserId,
    hasPermission,
    addSeller,
    removeSeller,
    toggleSellerActive,
    setSellerPermissions,
    getSellerPermissions,
    refreshSellers: fetchData,
  };
}
