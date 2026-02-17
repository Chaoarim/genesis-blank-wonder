import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { Part } from '@/hooks/usePartsDatabase';
import { CatalogsDialog } from './CatalogsDialog';

interface CatalogsSheetProps {
  parts: Part[];
  disabled?: boolean;
  onConsultAI?: (supplierName: string) => void;
}

export function CatalogsSheet({ parts, disabled, onConsultAI }: CatalogsSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        disabled={disabled}
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <BookOpen className="w-4 h-4" />
        Catálogos
      </Button>

      <CatalogsDialog
        open={open}
        onOpenChange={setOpen}
        parts={parts}
        onConsultAI={onConsultAI}
      />
    </>
  );
}
