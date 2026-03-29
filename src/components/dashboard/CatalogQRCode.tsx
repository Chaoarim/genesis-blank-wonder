import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download } from 'lucide-react';

interface CatalogQRCodeProps {
  url: string;
}

export function CatalogQRCode({ url }: CatalogQRCodeProps) {
  const [open, setOpen] = useState(false);

  const downloadQR = () => {
    const svg = document.getElementById('catalog-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement('a');
      a.download = 'catalogo-qrcode.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="w-4 h-4" /> QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle>QR Code do Catálogo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              id="catalog-qr-svg"
              value={url}
              size={200}
              level="M"
              includeMargin
            />
          </div>
          <p className="text-xs text-muted-foreground break-all">{url}</p>
          <Button onClick={downloadQR} className="gap-2 w-full">
            <Download className="w-4 h-4" /> Baixar QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
