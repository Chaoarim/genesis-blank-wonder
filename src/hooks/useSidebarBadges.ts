import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SidebarBadgeCounts {
  orders: number;
  'low-stock': number;
  'accounts-payable': number;
  'accounts-receivable': number;
  'repurchase-alerts': number;
  credit: number;
}

const REPURCHASE_DAYS = 30;

export function useSidebarBadges(
  adminUserId: string | null,
  sales: Array<{ customer_id: string | null; created_at: string; status: string }>,
) {
  const [counts, setCounts] = useState<SidebarBadgeCounts>({
    orders: 0,
    'low-stock': 0,
    'accounts-payable': 0,
    'accounts-receivable': 0,
    'repurchase-alerts': 0,
    credit: 0,
  });

  const fetchCounts = useCallback(async () => {
    if (!adminUserId) return;
    const today = new Date().toISOString().split('T')[0];

    const [ordersRes, stockRes, payablesRes, receivablesRes, creditRes] = await Promise.all([
      supabase.from('catalog_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).lte('qtd_estoque', 3).gt('qtd_estoque', -1),
      supabase.from('accounts_payable').select('id', { count: 'exact', head: true }).eq('status', 'pending').lte('due_date', today),
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('status', 'completed').is('paid_at', null).not('payment_deadline', 'is', null).lte('payment_deadline', today),
      supabase.from('credit_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    setCounts(prev => ({
      ...prev,
      orders: ordersRes.count ?? 0,
      'low-stock': stockRes.count ?? 0,
      'accounts-payable': payablesRes.count ?? 0,
      'accounts-receivable': receivablesRes.count ?? 0,
      credit: creditRes.count ?? 0,
    }));
  }, [adminUserId]);

  useEffect(() => {
    if (!adminUserId) return;
    fetchCounts();
    const interval = setInterval(fetchCounts, 120_000);
    return () => clearInterval(interval);
  }, [adminUserId, fetchCounts]);

  // Repurchase alerts from sales data
  const repurchaseCount = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - REPURCHASE_DAYS);

    const customerLastPurchase = new Map<string, Date>();
    for (const sale of sales) {
      if (sale.status !== 'completed' || !sale.customer_id) continue;
      const date = new Date(sale.created_at);
      const existing = customerLastPurchase.get(sale.customer_id);
      if (!existing || date > existing) {
        customerLastPurchase.set(sale.customer_id, date);
      }
    }

    let count = 0;
    customerLastPurchase.forEach((lastDate) => {
      if (lastDate < cutoff) count++;
    });
    return Math.min(count, 99);
  }, [sales]);

  return useMemo(() => ({
    ...counts,
    'repurchase-alerts': repurchaseCount,
  }), [counts, repurchaseCount]);
}
