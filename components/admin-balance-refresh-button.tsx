'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AdminBalanceRefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-2 text-xs"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.refresh()
        })
      }}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      Yenile
    </Button>
  )
}