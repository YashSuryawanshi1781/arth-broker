export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonRows({ rows = 4, className = '' }) {
  return (
    <div className={`${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row-between gap-md px-lg py-md">
          <div className="min- grow stack gap-md.5">
            <Skeleton className=".5" />
            <Skeleton className=".5" />
          </div>
          <div className="stack gap-md.5 right">
            <Skeleton className="ml-auto .5" />
            <Skeleton className="ml-auto .5" />
          </div>
        </div>
      ))}
    </div>
  )
}
