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
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'inventory', label: 'Estoque' },
  { key: 'low-stock', label: 'Estoque Baixo' },
  { key: 'history', label: 'Histórico' },
  { key: 'customers', label: 'Clientes' },
  { key: 'carteira', label: 'Carteira de Clientes' },
  { key: 'goals', label: 'Metas' },
  { key: 'markup', label: 'Markup' },
  { key: 'import-inventory', label: 'Importar' },
  { key: 'manual-product', label: 'Cadastrar' },
  { key: 'promotions', label: 'Ofertas' },
  { key: 'coupons', label: 'Cupons' },
  { key: 'sellers', label: 'Vendedores' },
  { key: 'commissions', label: 'Comissões' },
  { key: 'report', label: 'Relatório' },
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
      setSellers((sellersRes.data || []) as SellerUser[]);
      setLoading(false);
      return;
    }

    // 2) If not seller, check admin role explicitly
    const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });

    if (roleError) {
      console.error('Erro ao validar papel admin:', roleError.message);
    }

    if (hasAdminRole) {
      setIsAdmin(true);
      setSellerRecord(null);
      setPermissions([]);

      const { data: sellersData } = await supabase
        .from('seller_users')
        .select('*')
        .eq('admin_user_id', userId)
        .order('name');

      setSellers((sellersData || []) as SellerUser[]);
    } else {
      // Safety fallback: user without vínculo de vendedor e sem papel admin
      setIsAdmin(false);
      setSellerRecord(null);
      setPermissions([]);
      setSellers([]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasPermission = useCallback((tab: string) => {
    if (isAdmin) return true;

    // Core tabs always available for sellers (individual operation + visibility)
    if (['new-sale', 'dashboard', 'history', 'report', 'carteira'].includes(tab)) return true;

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
