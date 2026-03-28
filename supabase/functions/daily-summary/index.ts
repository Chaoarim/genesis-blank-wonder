import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Optional: accept user_id to generate report for specific user
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      const schema = z.object({ user_id: z.string().uuid().optional() });
      const parsed = schema.safeParse(body);
      if (parsed.success && parsed.data.user_id) {
        targetUserId = parsed.data.user_id;
      }
    } catch {
      // no body, generate for all users with sales today
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfDay = `${todayStr}T00:00:00.000Z`;
    const endOfDay = `${todayStr}T23:59:59.999Z`;

    // Fetch today's completed sales
    let salesQuery = supabase
      .from('sales')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('total', { ascending: false });

    if (targetUserId) {
      salesQuery = salesQuery.eq('user_id', targetUserId);
    }

    const { data: sales, error: salesErr } = await salesQuery;
    if (salesErr) throw salesErr;

    if (!sales || sales.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma venda hoje', date: todayStr, summary: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch sale items for top products
    const saleIds = sales.map((s: any) => s.id);
    const { data: items } = await supabase
      .from('sale_items')
      .select('*')
      .in('sale_id', saleIds);

    // Calculate summary
    const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.total), 0);
    const totalSales = sales.length;

    // Group sellers
    const sellerMap: Record<string, { name: string; total: number; count: number }> = {};
    for (const sale of sales) {
      const key = sale.seller_auth_id || 'admin';
      const name = sale.seller_name || 'Administrador';
      if (!sellerMap[key]) sellerMap[key] = { name, total: 0, count: 0 };
      sellerMap[key].total += Number(sale.total);
      sellerMap[key].count += 1;
    }
    const topSellers = Object.values(sellerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Group products
    const productMap: Record<string, { produto: string; qty: number; revenue: number }> = {};
    for (const item of (items || [])) {
      const key = item.codigo || item.produto;
      if (!productMap[key]) productMap[key] = { produto: item.produto, qty: 0, revenue: 0 };
      productMap[key].qty += Number(item.quantidade);
      productMap[key].revenue += Number(item.quantidade) * Number(item.preco_unitario);
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment methods breakdown
    const paymentMethods: Record<string, number> = {};
    for (const sale of sales) {
      const method = sale.payment_method || 'outro';
      paymentMethods[method] = (paymentMethods[method] || 0) + Number(sale.total);
    }

    // Build summary
    const summary = {
      date: todayStr,
      dateFormatted: today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      totalSales,
      totalRevenue,
      totalRevenueFormatted: totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      averageTicket: totalRevenue / totalSales,
      averageTicketFormatted: (totalRevenue / totalSales).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      topProducts,
      topSellers,
      paymentMethods,
      generatedAt: new Date().toISOString(),
    };

    // Build HTML report for potential email use
    const htmlReport = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Resumo Diário</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 24px; max-width: 600px; margin: auto; }
  h1 { font-size: 20px; color: #1a1a2e; margin-bottom: 4px; }
  .date { color: #666; font-size: 13px; margin-bottom: 20px; }
  .stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .stat { background: #f8f9fa; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase; }
  h2 { font-size: 14px; color: #444; margin: 16px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #888; padding: 6px 8px; border-bottom: 2px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; }
</style>
</head>
<body>
  <h1>📊 Resumo Diário de Vendas</h1>
  <p class="date">${summary.dateFormatted}</p>
  
  <div class="stat-grid">
    <div class="stat">
      <div class="stat-value">${totalSales}</div>
      <div class="stat-label">Vendas</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.totalRevenueFormatted}</div>
      <div class="stat-label">Faturamento</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.averageTicketFormatted}</div>
      <div class="stat-label">Ticket Médio</div>
    </div>
  </div>

  <h2>🏆 Top Produtos</h2>
  <table>
    <thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Receita</th></tr></thead>
    <tbody>
      ${topProducts.map(p => `
        <tr>
          <td>${p.produto}</td>
          <td style="text-align:center">${p.qty}</td>
          <td style="text-align:right">${p.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${topSellers.length > 1 ? `
  <h2>👤 Top Vendedores</h2>
  <table>
    <thead><tr><th>Vendedor</th><th style="text-align:center">Vendas</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${topSellers.map(s => `
        <tr>
          <td>${s.name}</td>
          <td style="text-align:center">${s.count}</td>
          <td style="text-align:right">${s.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`;

    return new Response(
      JSON.stringify({ message: 'Resumo gerado com sucesso', summary, htmlReport }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Daily summary error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar resumo diário' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
