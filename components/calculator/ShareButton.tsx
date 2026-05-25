'use client'
import { Link2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ShareButton() {
  function handleShare() {
    try {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success('Link copied!'))
        .catch(() => toast.error('Could not copy link'))
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Link2Icon className="mr-1.5 size-3.5" />
      Share
    </Button>
  )
}
