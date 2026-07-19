'use client'

import { Shield } from 'lucide-react'

const GuildPage = () => {
	return (
		<div className="space-y-5 py-4">
			<div className="flex items-center gap-2.5">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
					<Shield className="text-purple-400" size={18} />
				</div>
				<div>
					<h1 className="font-display text-xl font-bold text-foreground">Guild</h1>
					<p className="mt-0.5 text-[10px] text-muted-foreground">Unite with allies and conquer together</p>
				</div>
			</div>

			<div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
					<Shield className="text-purple-400" size={32} />
				</div>
				<div className="space-y-1">
					<h2 className="font-display text-lg font-bold text-foreground">Coming Soon</h2>
					<p className="text-sm text-muted-foreground max-w-xs">
						Guilds are being rebuilt. Check back in a future update.
					</p>
				</div>
			</div>
		</div>
	)
}

export default GuildPage
