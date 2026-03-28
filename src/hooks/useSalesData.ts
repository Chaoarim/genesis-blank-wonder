import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditAction } from '@/lib/auditLog';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  notes: string | null;
  code: string | null;
  seller_auth_id: string | null;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  endereco: string | null;
  limite_credito: number | null;
  empresa: string | null;
  comprador: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id: string | null;
  customer_name: string | null;
  status: string;
  channel: string;
  total: number;
  discount: number;
  notes: string | null;
  seller_auth_id: string | null;
  seller_name: string | null;
  delivery_type: string;
  payment_method: string;
  payment_deadline: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  user_id: string;
  codigo: string;
  produto: string;
  fornecedor: string | null;
  quantidade: number;
  preco_unitario: number;
  created_at: string;
}

export interface SalesGoal {
  id: string;
  user_id: string;
  month: number;
  year: number;
  goal_amount: number;
  seller_auth_id: string | null;
}

export function useSalesData(userId: string | null, sellerAuthId?: string | null) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [custRes, salesRes, goalsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_goals').select('*'),
      ]);
      if (custRes.data) setCustomers(custRes.data as Customer[]);
      if (salesRes.data) setSales(salesRes.data as Sale[]);
      if (goalsRes.data) setGoals(goalsRes.data as SalesGoal[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- Customers ----
  const addCustomer = useCallback(async (data: { name: string; phone?: string; email?: string; whatsapp?: string; notes?: string; seller_auth_id?: string | null; cpf_cnpj?: string; inscricao_estadual?: string; endereco?: string; limite_credito?: number; empresa?: string; comprador?: string }) => {
    if (!userId) return null;
    const insertData: any = { ...data, user_id: userId };

    if (sellerAuthId) {
      insertData.seller_auth_id = sellerAuthId;
    } else if (typeof data.seller_auth_id !== 'undefined') {
      insertData.seller_auth_id = data.seller_auth_id;
    }

    const { data: row, error } = await supabase.from('customers').insert(insertData).select().single();
    if (error) { toast.error('Erro ao salvar cliente'); return null; }
    setCustomers(prev => [...prev, row as Customer]);
    toast.success('Cliente salvo!');
    return row;
  }, [userId, sellerAuthId]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    const { error } = await supabase.from('customers').update(data).eq('id', id);
    if (error) { toast.error('Erro ao atualizar cliente'); return; }
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } as Customer : c));
    toast.success('Cliente atualizado!');
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir cliente'); return; }
    setCustomers(prev => prev.filter(c => c.id !== id));
    toast.success('Cliente excluído');
  }, []);

  // ---- Sales ----
  const createSale = useCallback(async (data: {
    customer_id?: string;
    customer_name?: string;
    channel?: string;
    delivery_type?: string;
    payment_method?: string;
    payment_deadline?: string;
    seller_auth_id?: string;
    seller_name?: string;
    notes?: string;
    items: { codigo: string; produto: string; fornecedor?: string; quantidade: number; preco_unitario: number }[];
    discount?: number;
  }) => {
    if (!userId) return null;
    const total = data.items.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0) - (data.discount || 0);

    const { data: sale, error } = await supabase.from('sales').insert({
      user_id: userId,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || null,
      channel: data.channel || 'balcao',
      delivery_type: data.delivery_type || 'retirada',
      payment_method: data.payment_method || 'dinheiro',
      payment_deadline: data.payment_deadline || null,
      seller_auth_id: data.seller_auth_id || null,
      seller_name: data.seller_name || null,
      status: 'completed',
      total,
      discount: data.discount || 0,
      notes: data.notes || null,
    }).select().single();

    if (error || !sale) { toast.error('Erro ao criar venda'); return null; }

    const items = data.items.map(i => ({
      sale_id: sale.id,
      user_id: userId,
      codigo: i.codigo,
      produto: i.produto,
      fornecedor: i.fornecedor || null,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
    }));

    await supabase.from('sale_items').insert(items);
    setSales(prev => [sale as Sale, ...prev]);
    logAuditAction({ action: 'create', entity_type: 'sale', entity_id: sale.id, details: { total, customer: data.customer_name } });
    toast.success('Venda registrada!');
    return sale;
  }, [userId]);

  const deleteSale = useCallback(async (id: string) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir venda'); return; }
    setSales(prev => prev.filter(s => s.id !== id));
    logAuditAction({ action: 'delete', entity_type: 'sale', entity_id: id });
    toast.success('Venda excluída');
  }, []);

  const getSaleItems = useCallback(async (saleId: string) => {
    const { data } = await supabase.from('sale_items').select('*').eq('sale_id', saleId);
    return (data || []) as SaleItem[];
  }, []);

  // ---- Goals ----
  const setGoal = useCallback(async (month: number, year: number, amount: number, sellerAuthId?: string | null) => {
    if (!userId) return;
    const existing = goals.find(g => g.month === month && g.year === year && g.seller_auth_id === (sellerAuthId || null));

    if (existing) {
      const { error } = await supabase
        .from('sales_goals')
        .update({ goal_amount: amount })
        .eq('id', existing.id);

      if (error) {
        toast.error('Erro ao atualizar meta');
        return;
      }

      setGoals(prev => prev.map(g => g.id === existing.id ? { ...g, goal_amount: amount } : g));
      toast.success('Meta atualizada!');
      return;
    }

    const insertData: any = { user_id: userId, month, year, goal_amount: amount };
    if (sellerAuthId) insertData.seller_auth_id = sellerAuthId;

    const { data, error } = await supabase
      .from('sales_goals')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      toast.error('Erro ao salvar meta. Verifique o vendedor e tente novamente.');
      return;
    }

    setGoals(prev => [...prev, data as SalesGoal]);
    toast.success('Meta atualizada!');
  }, [userId, goals]);

  const deleteGoal = useCallback(async (goalId: string) => {
    await supabase.from('sales_goals').delete().eq('id', goalId);
    setGoals(prev => prev.filter(g => g.id !== goalId));
    toast.success('Meta excluída!');
  }, []);

  // ---- Filter by seller if applicable ----
  const effectiveSales = sellerAuthId
    ? sales.filter(s => s.seller_auth_id === sellerAuthId)
    : sales;

  const effectiveCustomers = sellerAuthId
    ? customers.filter((c: any) => c.seller_auth_id === sellerAuthId || !c.seller_auth_id)
    : customers;

  // ---- Stats ----
  const now = new Date();
  const todaySales = effectiveSales.filter(s => s.status === 'completed' && new Date(s.created_at).toDateString() === now.toDateString());
  const monthSales = effectiveSales.filter(s => s.status === 'completed' && new Date(s.created_at).getMonth() === now.getMonth() && new Date(s.created_at).getFullYear() === now.getFullYear());
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekSales = effectiveSales.filter(s => s.status === 'completed' && new Date(s.created_at) >= weekStart);

  const todayTotal = todaySales.reduce((s, v) => s + Number(v.total), 0);
  const weekTotal = weekSales.reduce((s, v) => s + Number(v.total), 0);
  const monthTotal = monthSales.reduce((s, v) => s + Number(v.total), 0);
  // Goals for current month
  const individualGoal = sellerAuthId
    ? goals.find(g => g.month === now.getMonth() + 1 && g.year === now.getFullYear() && g.seller_auth_id === sellerAuthId)
    : undefined;

  const storeGoal = goals.find(g => g.month === now.getMonth() + 1 && g.year === now.getFullYear() && !g.seller_auth_id);
  const currentGoal = sellerAuthId ? individualGoal : storeGoal;

  const goalProgress = currentGoal ? Math.min((monthTotal / Number(currentGoal.goal_amount)) * 100, 100) : 0;
  const individualGoalProgress = individualGoal ? Math.min((monthTotal / Number(individualGoal.goal_amount)) * 100, 100) : 0;

  const storeMonthTotal = sales
    .filter(s => s.status === 'completed' && new Date(s.created_at).getMonth() === now.getMonth() && new Date(s.created_at).getFullYear() === now.getFullYear())
    .reduce((sum, s) => sum + Number(s.total), 0);

  const storeGoalProgress = storeGoal ? Math.min((storeMonthTotal / Number(storeGoal.goal_amount)) * 100, 100) : 0;
  const dailyTotals = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const dayTotal = effectiveSales
      .filter(s => s.status === 'completed' && new Date(s.created_at).toDateString() === dayStr)
      .reduce((sum, s) => sum + Number(s.total), 0);
    return { day: d.toLocaleDateString('pt-BR', { weekday: 'short' }), total: dayTotal };
  });

  return {
    customers: effectiveCustomers, allCustomers: customers, sales: effectiveSales, allSales: sales, goals, loading, fetchAll,
    addCustomer, updateCustomer, deleteCustomer,
    createSale, deleteSale, getSaleItems,
    setGoal, deleteGoal,
    stats: { todayTotal, weekTotal, monthTotal, todaySales: todaySales.length, monthSales: monthSales.length, goalProgress, currentGoal, individualGoal, individualGoalProgress, storeGoal, storeMonthTotal, storeGoalProgress, dailyTotals },
  };
}
