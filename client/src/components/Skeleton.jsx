export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonRows({ rows = 4, className = '' }) {
  return (
    <div className={`divide-y divide-line ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          <div className="space-y-1.5 text-right">
            <Skeleton className="ml-auto h-3.5 w-20" />
            <Skeleton className="ml-auto h-2.5 w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}
