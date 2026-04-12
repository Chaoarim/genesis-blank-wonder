import { Card } from '@/components/ui/card';

interface FleetRankingsManagerProps {
  adminUserId: string | null;
  readOnly?: boolean;
}

export function FleetRankingsManager({ adminUserId, readOnly = false }: FleetRankingsManagerProps) {
  return (
    <div className="space-y-6">
      <Card className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">Módulo em construção</p>
        <p className="text-sm mt-1">Aguardando novas instruções...</p>
      </Card>
    </div>
  );
}
