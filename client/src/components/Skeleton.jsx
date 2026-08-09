export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonRows({ rows = 4, className = '' }) {
  return (
    <div className={`${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row-between gap-md px-lg py-md">
          <div className="min-w-0 grow stack gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="stack gap-1.5 right">
            <Skeleton className="ml-auto h-3 w-16" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
