import { useState } from 'react';
import { Package } from 'lucide-react';

interface PartThumbnailProps {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
}

export function PartThumbnail({ imageUrl, alt = '', className = 'w-8 h-8' }: PartThumbnailProps) {
  const [error, setError] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className={`${className} rounded bg-muted flex items-center justify-center shrink-0`}>
        <Package className="w-3.5 h-3.5 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={`${className} rounded bg-muted overflow-hidden shrink-0`}>
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
}
