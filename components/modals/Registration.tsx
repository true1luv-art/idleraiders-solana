'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context'
import { Loader2, Sword, Shield, Coins, CheckCircle2, LogOut, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface RegistrationModalProps {
	open: boolean
	username: string
	referredBy?: string
	onRegistrationComplete: () => void
	onLogout: () => void
}

const RegistrationModal = ({ open, username, referredBy, onRegistrationComplete, onLogout }: RegistrationModalProps) => {
	const { setRegistered } = useAuth()

	const [isProcessing, setIsProcessing] = useState(false)
	const [status, setStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const handleRegistration = useCallback(async () => {
		if (!username) return

		setIsProcessing(true)
		setStatus('registering')
		setErrorMessage(null)

		try {
			const res = await fetch('/api/transactions/registration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ referral: referredBy || 'idleraiders' }),
			})

			const data = await res.json()

			if (!res.ok || !data.success) {
				throw new Error(data.error || 'Registration failed')
			}

			setStatus('success')
			setRegistered(true)
			toast.success('Welcome to Idle Raiders! Your adventure begins.')

			setTimeout(() => {
				onRegistrationComplete()
			}, 1500)
		} catch (error) {
			setStatus('error')
			const message = error instanceof Error ? error.message : 'Registration failed'
			setErrorMessage(message)
			toast.error(message)
		} finally {
			setIsProcessing(false)
		}
	}, [username, referredBy, setRegistered, onRegistrationComplete])

	const handleLogout = useCallback(() => {
		onLogout()
	}, [onLogout])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						className="fantasy-card glow-gold w-full max-w-md space-y-5 p-6"
					>
						{/* Header */}
						<div className="text-center space-y-2">
							<h2 className="font-display text-2xl font-bold text-primary text-glow-gold">
								Begin Your Adventure
							</h2>
							<p className="text-sm text-muted-foreground">
								Welcome, <span className="text-foreground font-medium">@{username}</span>! Create your
								free account to start playing.
							</p>
						</div>

						{/* Benefits */}
						<div className="space-y-3">
							<h3 className="text-sm font-semibold text-foreground">What you get</h3>
							<div className="space-y-2">
								<div className="flex items-center gap-3 text-sm">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
										<Sword size={16} className="text-primary" />
									</div>
									<div>
										<p className="font-medium text-foreground">Full Game Access</p>
										<p className="text-xs text-muted-foreground">Send heroes on missions and earn rewards</p>
									</div>
								</div>
								<div className="flex items-center gap-3 text-sm">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
										<Shield size={16} className="text-primary" />
									</div>
									<div>
										<p className="font-medium text-foreground">Collect Hero Cards</p>
										<p className="text-xs text-muted-foreground">Build your roster and level up your team</p>
									</div>
								</div>
								<div className="flex items-center gap-3 text-sm">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
										<Coins size={16} className="text-primary" />
									</div>
									<div>
										<p className="font-medium text-foreground">Earn &amp; Trade</p>
										<p className="text-xs text-muted-foreground">Access the marketplace and withdraw earnings</p>
									</div>
								</div>
							</div>
						</div>

						{/* Free badge */}
						<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-foreground">Registration</p>
								<p className="text-xs text-muted-foreground">No payment required</p>
							</div>
							<span className="text-lg font-bold text-primary">Free</span>
						</div>

						{/* Referral Info */}
						{referredBy && referredBy !== 'idleraiders' && (
							<div className="rounded-lg border border-border bg-secondary/30 p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs text-muted-foreground">Referred by</p>
										<p className="text-sm font-medium text-foreground">@{referredBy}</p>
									</div>
									<a
										href="https://discord.gg/PZzN2DKZxq"
										target="_blank"
										rel="noopener noreferrer"
										className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline"
									>
										Wrong referral? Contact support
									</a>
								</div>
							</div>
						)}

						{/* Error Message */}
						{errorMessage && (
							<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
								<AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
								<p className="text-sm text-destructive">{errorMessage}</p>
							</div>
						)}

						{/* Status */}
						{status === 'registering' && (
							<div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center gap-3">
								<Loader2 size={18} className="text-primary animate-spin" />
								<div>
									<p className="text-sm font-medium text-foreground">Creating your account...</p>
									<p className="text-xs text-muted-foreground">Just a moment</p>
								</div>
							</div>
						)}
						{status === 'success' && (
							<div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center gap-3">
								<CheckCircle2 size={18} className="text-green-500" />
								<div>
									<p className="text-sm font-medium text-green-500">Registration Complete!</p>
									<p className="text-xs text-muted-foreground">Starting your adventure...</p>
								</div>
							</div>
						)}

						{/* Actions */}
						<div className="space-y-3">
							<Button
								onClick={handleRegistration}
								disabled={isProcessing || status === 'success'}
								className="w-full fantasy-btn"
							>
								{isProcessing ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Registering...
									</>
								) : status === 'success' ? (
									<>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Registered!
									</>
								) : (
									'Start Playing — It\'s Free'
								)}
							</Button>

							<button
								onClick={handleLogout}
								disabled={isProcessing}
								className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-2"
							>
								<LogOut size={12} />
								Sign out and use a different account
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	)
}

export default RegistrationModal
