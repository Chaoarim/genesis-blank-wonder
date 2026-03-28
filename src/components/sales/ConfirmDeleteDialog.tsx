import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

interface ConfirmDeleteDialogProps {
  /** What will be shown in the trigger — defaults to a Trash2 icon button */
  trigger?: ReactNode;
  title?: string;
  description?: string;
  onConfirm: () => void;
  /** Size of the default trash icon button */
  iconSize?: 'sm' | 'md';
  /** Extra class for the trigger button when using the default icon */
  triggerClassName?: string;
}

export function ConfirmDeleteDialog({
  trigger,
  title = 'Confirmar exclusão',
  description = 'Tem certeza que deseja excluir? Esta ação não pode ser desfeita.',
  onConfirm,
  iconSize = 'sm',
  triggerClassName,
}: ConfirmDeleteDialogProps) {
  const defaultTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className={`${iconSize === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} text-destructive ${triggerClassName ?? ''}`}
    >
      <Trash2 className={iconSize === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
    </Button>
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
