import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TABLES_TO_BACKUP = [
  'sales',
  'sale_items',
  'customers',
  'inventory_items',
  'accounts_payable',
  'supplier_contacts',
  'warranty_returns',
  'credit_approvals',
  'sales_commissions',
  'sales_goals',
  'seller_users',
  'markup_settings',
  'payment_term_rules',
  'discount_coupons',
  'profiles',
];

async function fetchAllRows(supabase: any, table: string) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      return { table, error: error.message, rows: [] };
    }

    allRows = allRows.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return { table, rows: allRows, count: allRows.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const backupDate = now.toISOString().split('T')[0];

    console.log(`Starting weekly backup for ${backupDate}...`);

    // Fetch all tables in parallel
    const results = await Promise.all(
      TABLES_TO_BACKUP.map((table) => fetchAllRows(supabase, table))
    );

    const backup: Record<string, any> = {
      metadata: {
        generated_at: now.toISOString(),
        date: backupDate,
        tables_count: TABLES_TO_BACKUP.length,
      },
      tables: {},
    };

    let totalRows = 0;
    const errors: string[] = [];

    for (const result of results) {
      if (result.error) {
        errors.push(`${result.table}: ${result.error}`);
      }
      backup.tables[result.table] = {
        count: result.count,
        rows: result.rows,
      };
      totalRows += result.count || 0;
    }

    backup.metadata.total_rows = totalRows;
    backup.metadata.errors = errors;

    const backupJson = JSON.stringify(backup, null, 2);
    const backupBlob = new Blob([backupJson], { type: 'application/json' });

    // Upload to Supabase Storage
    const fileName = `backup_${backupDate}.json`;
    const bucketName = 'backups';

    // Try to create the bucket (ignore if exists)
    await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    });

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, backupBlob, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Even if upload fails, return the backup data
      return new Response(
        JSON.stringify({
          message: 'Backup gerado mas falhou ao salvar no storage',
          error: uploadError.message,
          metadata: backup.metadata,
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up old backups (keep last 4 weeks)
    const { data: files } = await supabase.storage.from(bucketName).list('', {
      sortBy: { column: 'created_at', order: 'asc' },
    });

    if (files && files.length > 4) {
      const toDelete = files.slice(0, files.length - 4).map((f: any) => f.name);
      await supabase.storage.from(bucketName).remove(toDelete);
      console.log(`Cleaned up ${toDelete.length} old backups`);
    }

    console.log(`Backup completed: ${totalRows} rows across ${TABLES_TO_BACKUP.length} tables`);

    return new Response(
      JSON.stringify({
        message: 'Backup semanal gerado com sucesso',
        metadata: backup.metadata,
        storage_path: `${bucketName}/${fileName}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Backup error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar backup semanal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
