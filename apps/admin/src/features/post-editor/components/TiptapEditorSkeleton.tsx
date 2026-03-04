import { Skeleton } from '@/components/ui/skeleton';

export function TiptapEditorSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex h-11 items-center gap-1 border-b bg-muted/50 px-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded" />
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <Skeleton className="h-8 w-8 rounded" />
        <div className="mx-1 h-5 w-px bg-border" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded" />
        ))}
      </div>
      <Skeleton className="m-4 h-[300px] rounded" />
    </div>
  );
}
