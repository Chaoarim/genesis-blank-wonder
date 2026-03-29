import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomerAvatarUploadProps {
  customerId: string;
  currentUrl?: string | null;
  customerName: string;
  onUploaded: (url: string) => void;
  size?: 'sm' | 'md';
}

export function CustomerAvatarUpload({ customerId, currentUrl, customerName, onUploaded, size = 'md' }: CustomerAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = customerName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const sizeClass = size === 'sm' ? 'h-10 w-10' : 'h-16 w-16';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `customers/${customerId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-avatars')
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setPreviewUrl(urlWithCacheBust);
      onUploaded(urlWithCacheBust);
      toast.success('Foto atualizada!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar foto. Verifique se o bucket existe.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group inline-block">
      <Avatar className={sizeClass}>
        <AvatarImage src={previewUrl || undefined} alt={customerName} />
        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : (
          <Camera className="w-4 h-4 text-white" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
