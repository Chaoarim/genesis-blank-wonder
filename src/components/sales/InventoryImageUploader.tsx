import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImagePlus, Upload, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InventoryImageUploaderProps {
  onImagesUploaded: () => void;
}

export function InventoryImageUploader({ onImagesUploaded }: InventoryImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Faça login primeiro');
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: files.length });

    let successCount = 0;
    const updatedCodes = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Extract code from filename: "110377.jpg" → "110377", "110377_1.png" → "110377"
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
      const codigo = nameWithoutExt.replace(/[_\-\s]\d+$/, '').trim();

      if (!codigo) {
        console.warn(`Arquivo ${file.name} ignorado - código não identificado`);
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `inventory/${user.id}/${codigo}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('part-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(`Erro upload ${file.name}:`, uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('part-images')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // Update all inventory items with this code for this user
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ image_url: imageUrl })
        .eq('user_id', user.id)
        .eq('codigo', codigo);

      if (!updateError) {
        successCount++;
        updatedCodes.add(codigo);
      }

      setProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';

    if (successCount > 0) {
      toast.success(`${updatedCodes.size} código(s) com foto atualizada!`);
      onImagesUploaded();
    } else {
      toast.error('Nenhuma foto vinculada. Renomeie os arquivos com o código da peça (ex: 110377.jpg)');
    }
  }, [onImagesUploaded]);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <ImagePlus className="w-5 h-5 text-primary" />
        Upload de Fotos em Lote
      </h3>
      <p className="text-xs text-muted-foreground">
        Selecione várias fotos de uma vez. O nome do arquivo deve ser o <strong>código da peça</strong> (ex: <code>110377.jpg</code>, <code>110428.png</code>). A foto será vinculada a todos os itens com aquele código.
      </p>
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? `Enviando ${progress.done}/${progress.total}...` : 'Selecionar Fotos'}
        </Button>
        {uploading && (
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
