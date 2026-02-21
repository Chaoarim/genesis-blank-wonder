import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, Loader2, Image, Search, X, Check } from 'lucide-react';

interface PartImageUploaderProps {}

interface PartRow {
  id: string;
  fabricante: string | null;
  codigo_peca: string | null;
  descricao: string | null;
  image_url: string | null;
}

const PAGE_SIZE = 50;

export function PartImageUploader({}: PartImageUploaderProps) {
  const [supplierFilter, setSupplierFilter] = useState('');
  const [parts, setParts] = useState<PartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [searched, setSearched] = useState(false);

  const loadPartsBySupplier = useCallback(async () => {
    if (!supplierFilter.trim()) {
      toast.error('Digite o nome do fornecedor');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('id, fabricante, codigo_peca, descricao, image_url')
        .ilike('fabricante', `%${supplierFilter.trim()}%`)
        .limit(500);

      if (error) throw error;
      setParts(data || []);
      if (!data?.length) toast.info('Nenhuma peça encontrada para esse fornecedor');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar peças');
    } finally {
      setLoading(false);
    }
  }, [supplierFilter]);

  const handleImageUpload = useCallback(async (partId: string, file: File) => {
    setUploading(prev => ({ ...prev, [partId]: true }));
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${partId}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('part-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('part-images')
        .getPublicUrl(path);

      // Find the codigo_peca for this part
      const targetPart = parts.find(p => p.id === partId);
      const codigoPeca = targetPart?.codigo_peca;

      if (codigoPeca) {
        // Update ALL parts with the same codigo_peca
        const { error: updateError } = await supabase
          .from('parts')
          .update({ image_url: urlData.publicUrl })
          .eq('codigo_peca', codigoPeca);

        if (updateError) throw updateError;

        // Update local state for all matching parts
        setParts(prev => prev.map(p =>
          p.codigo_peca === codigoPeca ? { ...p, image_url: urlData.publicUrl } : p
        ));
      } else {
        // Fallback: update only this part
        const { error: updateError } = await supabase
          .from('parts')
          .update({ image_url: urlData.publicUrl })
          .eq('id', partId);

        if (updateError) throw updateError;

        setParts(prev => prev.map(p =>
          p.id === partId ? { ...p, image_url: urlData.publicUrl } : p
        ));
      }

      toast.success('Imagem salva!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(prev => ({ ...prev, [partId]: false }));
    }
  }, []);

  const handleBatchUpload = useCallback(async (files: FileList) => {
    // Match files by name to part codigo_peca
    let matched = 0;
    for (const file of Array.from(files)) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '').trim().toUpperCase();
      const matchingPart = parts.find(p =>
        p.codigo_peca?.trim().toUpperCase() === nameWithoutExt
      );
      if (matchingPart) {
        await handleImageUpload(matchingPart.id, file);
        matched++;
      }
    }
    if (matched > 0) {
      toast.success(`${matched} imagens vinculadas por código!`);
    } else {
      toast.warning('Nenhuma imagem correspondeu a um código de peça. Nomeie os arquivos com o código da peça (ex: ABC123.jpg)');
    }
  }, [parts, handleImageUpload]);

  return (
    <Card className="p-6 glass-card space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Image className="w-5 h-5 text-primary" />
        Upload de Imagens por Fornecedor
      </h3>

      <p className="text-sm text-muted-foreground">
        Busque por fornecedor e faça upload individual ou em lote. Para upload em lote, nomeie os arquivos com o código da peça (ex: <code className="bg-muted px-1 rounded">ABC123.jpg</code>).
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome do fornecedor..."
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadPartsBySupplier()}
            className="pl-10"
          />
        </div>
        <Button onClick={loadPartsBySupplier} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
        </Button>
      </div>

      {parts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {parts.length} peças encontradas · {parts.filter(p => p.image_url).length} com imagem
            </span>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Upload className="w-4 h-4" />
              Upload em Lote
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => e.target.files && handleBatchUpload(e.target.files)}
              />
            </label>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-border">
              {parts.map(part => (
                <div key={part.id} className="flex items-center gap-3 py-2.5 px-1">
                  <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {part.image_url ? (
                      <img
                        src={part.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Image className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-semibold text-primary block truncate">
                      {part.codigo_peca}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {part.descricao}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {part.image_url && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    <label className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                      uploading[part.id]
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}>
                      {uploading[part.id] ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      {part.image_url ? 'Trocar' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading[part.id]}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(part.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {searched && parts.length === 0 && !loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhuma peça encontrada para "{supplierFilter}"
        </div>
      )}
    </Card>
  );
}
