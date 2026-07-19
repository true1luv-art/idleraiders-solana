'use client'

import { Wand2 } from 'lucide-react'

const CraftingPage = () => {
  return (
    <div className="space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Wand2 className="text-primary" size={18} />
        </div>
        <div>
          <h1 className="font-display text-lg md:text-xl font-bold text-foreground leading-tight">
            Crafting
          </h1>
          <p className="text-[10px] text-muted-foreground/60">Forge powerful cards from materials</p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="fantasy-card flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <Wand2 className="text-primary" size={28} />
        </div>
        <div className="space-y-1">
          <p className="font-display text-base font-bold text-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            The crafting workshop is being rebuilt. Check back soon to forge new cards.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CraftingPage
