import { useState } from 'react';
import { Package } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface PartThumbnailProps {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
}

export function PartThumbnail({ imageUrl, alt = '', className = 'w-8 h-8' }: PartThumbnailProps) {
  const [error, setError] = useState(false);
  const [showFull, setShowFull] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className={`${className} rounded bg-muted flex items-center justify-center shrink-0`}>
        <Package className="w-3.5 h-3.5 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`${className} rounded bg-muted overflow-hidden shrink-0 cursor-pointer ring-offset-background transition-opacity hover:opacity-80`}
        onClick={(e) => { e.stopPropagation(); setShowFull(true); }}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      </div>

      <Dialog open={showFull} onOpenChange={setShowFull}>
        <DialogContent className="max-w-lg p-2 bg-background border border-border" aria-describedby={undefined}>
          <DialogTitle className="text-sm font-medium text-foreground px-2 pt-1 truncate">
            {alt || 'Imagem da peça'}
          </DialogTitle>
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-auto rounded object-contain max-h-[70vh]"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}