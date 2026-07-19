'use client'

import { Trophy } from 'lucide-react'

const LeaderboardPage = () => {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 py-12 text-center">
			<div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border border-primary/20">
				<Trophy className="h-8 w-8 text-primary" />
			</div>
			<div className="space-y-1">
				<h1 className="font-display text-2xl font-bold text-foreground">Leaderboard</h1>
				<p className="text-sm text-muted-foreground max-w-xs">
					Rankings are coming soon. Compete in boss raids to earn your place at the top.
				</p>
			</div>
		</div>
	)
}

export default LeaderboardPage
