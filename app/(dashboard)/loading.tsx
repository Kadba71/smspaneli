function LoadingBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-card/70 border border-border/60 ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <LoadingBlock className="h-10 w-56" />
        <LoadingBlock className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
      </div>

      <LoadingBlock className="h-80" />
      <LoadingBlock className="h-64" />
    </div>
  )
}