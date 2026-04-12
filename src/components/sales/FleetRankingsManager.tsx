import { DemandAnalysis } from './DemandAnalysis';

interface FleetRankingsManagerProps {
  adminUserId: string | null;
  readOnly?: boolean;
}

export function FleetRankingsManager({ adminUserId, readOnly = false }: FleetRankingsManagerProps) {
  return <DemandAnalysis adminUserId={adminUserId} />;
}
