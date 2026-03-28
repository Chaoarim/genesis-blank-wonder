import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface ListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
  /** Variant: 'card' for card-style lists, 'table-row' for table rows, 'compact' for small inline */
  variant?: 'card' | 'table-row' | 'compact';
}

function CardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
          <div className="flex gap-2 mt-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      </div>
    </Card>
  );
}

function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-20' : i === 1 ? 'w-32' : 'w-16'}`} />
        </td>
      ))}
    </tr>
  );
}

function CompactSkeleton() {
  return (
    <div className="flex items-center gap-2 py-2">
      <Skeleton className="w-8 h-8 rounded shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4, variant = 'card' }: ListSkeletonProps) {
  if (variant === 'compact') {
    return (
      <div className="space-y-1 py-2">
        {Array.from({ length: count }).map((_, i) => (
          <CompactSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Dashboard-style stats skeleton with 4 cards */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
