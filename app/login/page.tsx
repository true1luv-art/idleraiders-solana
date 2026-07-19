'use client'

import { useState, useEffect, Suspense, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/context'
import { isHiveKeychainAvailable } from '@/lib/auth/wallet-adapters/hive'
import { Loader2, FileText, ShieldCheck, UserPlus, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LegalModal from '@/components/modals/Legal'
import { GAME_UI_IMAGES } from '@/features/images'
import Link from 'next/link'

interface LoginResult {
	success: boolean
	isRegistered?: boolean
}

// ─── Lore bullets ───────────────────────────────────────────────────────────
const BULLETS = [
	{ label: 'Sign in with your Posting key — no tokens are spent' },
	{ label: 'Requires the Hive Keychain browser extension' },
	{ label: 'Your progress is saved server-side across all devices' },
]

function Bullet({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-3 text-sm text-muted-foreground">
			<span className="w-2 h-2 rounded-sm bg-primary rotate-45 shrink-0" />
			<span>{label}</span>
		</div>
	)
}

// ─── Login Card ──────────────────────────────────────────────────────────────
const LoginCard = () => {
	const router = useRouter()
	const { login, isLoading, error } = useAuth()
	const [username, setUsername] = useState('')
	const [referralCode, setReferralCode] = useState('')
	const [showReferral, setShowReferral] = useState(false)
	const [sessionExpired, setSessionExpired] = useState(false)
	const [keychainAvailable, setKeychainAvailable] = useState(true)

	useEffect(() => {
		setKeychainAvailable(isHiveKeychainAvailable())

		const params = new URLSearchParams(window.location.search)
		if (params.get('session_expired') === 'true') setSessionExpired(true)
		const ref = params.get('ref')
		if (ref) {
			setReferralCode(ref)
			setShowReferral(true)
		}
	}, [])

	const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!username.trim()) return

		const result = (await login(username.trim().toLowerCase(), referralCode.trim())) as LoginResult
		if (result?.success) {
			router.push('/game')
		}
	}

	return (
		<div className="fantasy-card glow-gold w-full space-y-5 p-6">
			{/* Card header */}
			<div className="flex items-center justify-between border-b border-border pb-4">
				<h2 className="font-display text-sm font-bold text-foreground tracking-wide uppercase">
					Sign In
				</h2>
				<div className="flex items-center gap-2">
					<span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_theme(colors.green.500)]" />
					<span className="text-[10px] text-green-500 font-mono tracking-widest uppercase">Ready</span>
				</div>
			</div>

			{/* Chain badge */}
			<div>
				<span className="text-[10px] font-mono tracking-widest text-primary border border-primary/40 px-2.5 py-1 uppercase">
					Hive Blockchain
				</span>
			</div>

			{/* Session expired banner */}
			{sessionExpired && (
				<div className="rounded-lg border border-amber-600/50 bg-amber-600/10 p-3 text-sm text-amber-500">
					<p className="font-semibold text-xs">Session Expired</p>
					<p className="mt-0.5 text-[11px] text-muted-foreground">
						Your login session has expired. Please sign in again.
					</p>
				</div>
			)}

			{/* Keychain not installed warning */}
			{!keychainAvailable && (
				<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
					<p className="text-sm text-destructive font-medium">Hive Keychain not installed.</p>
					<a
						href="https://hive-keychain.com"
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
					>
						Get it here <ExternalLink size={10} />
					</a>
				</div>
			)}

			{/* Form */}
			<form onSubmit={handleLogin} className="space-y-4">
				{/* @ prefix input */}
				<div>
					<label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase block mb-2">
						Hive Username
					</label>
					<div className="flex">
						<span className="flex items-center justify-center px-3 border border-r-0 border-input bg-secondary/50 text-primary font-mono text-base">
							@
						</span>
						<Input
							placeholder="youraccount"
							value={username}
							onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
							disabled={isLoading}
							autoComplete="off"
							spellCheck={false}
							autoFocus
							className="rounded-l-none font-mono"
						/>
					</div>
					<p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
						Hive Keychain will prompt you to sign with your Posting key. No tokens are spent.
					</p>
				</div>

				{/* Referral toggle */}
				{!showReferral ? (
					<button
						type="button"
						onClick={() => setShowReferral(true)}
						className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
					>
						<UserPlus size={12} />
						Have a referral code?
					</button>
				) : (
					<div className="space-y-1.5">
						<label className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase block">
							Referral Code
						</label>
						<Input
							placeholder="friend's username (optional)"
							value={referralCode}
							onChange={(e) => setReferralCode(e.target.value)}
							disabled={isLoading}
							className="font-mono text-sm"
						/>
						<p className="text-[10px] text-muted-foreground">
							Enter a friend&apos;s Hive username if they referred you
						</p>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
						<AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
						<div className="space-y-1">
							<p className="text-xs text-destructive font-semibold">{error}</p>
							{error.includes('timed out') && (
								<ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
									<li>Ensure Keychain is enabled (not in private / incognito mode)</li>
									<li>Refresh the page and try again</li>
									<li>Check if the extension icon appears in your browser toolbar</li>
								</ul>
							)}
						</div>
					</div>
				)}

				<Button
					type="submit"
					disabled={isLoading || !username.trim() || !keychainAvailable}
					className="w-full fantasy-btn py-5 text-sm font-mono tracking-wide"
				>
					{isLoading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Waiting for Keychain...
						</>
					) : (
						'Sign In with Hive'
					)}
				</Button>
			</form>
		</div>
	)
}

// ─── Page ────────────────────────────────────────────────────────────────────
const LoginPage = () => {
	const router = useRouter()
	const [termsOpen, setTermsOpen] = useState(false)
	const [privacyOpen, setPrivacyOpen] = useState(false)

	return (
		<div
			className="min-h-screen bg-background text-foreground"
			style={{
				backgroundImage: `radial-gradient(ellipse at 60% 40%, hsl(43 85% 59% / 0.04) 0%, transparent 60%), url(${GAME_UI_IMAGES.background})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundBlendMode: 'overlay',
			}}
		>
			{/* Nav */}
			<nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5 border-b border-border/40">
				<Link href="/" className="flex items-center gap-3">
					<img src={GAME_UI_IMAGES.logo} alt="IdleRaiders Logo" className="h-8" />
				</Link>
				<button
					onClick={() => router.push('/')}
					className="text-[11px] font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors uppercase"
				>
					← Back
				</button>
			</nav>

			{/* Two-column layout */}
			<section className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
				{/* Lore side */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
					className="space-y-8"
				>
					<div className="space-y-2">
						<div className="flex items-center gap-3 flex-wrap">
							<span className="text-[10px] font-mono tracking-widest text-primary border border-primary/40 px-2.5 py-1 uppercase">
								Hive Blockchain
							</span>
							<span className="text-[10px] font-mono tracking-widest text-muted-foreground border border-border px-2.5 py-1 uppercase">
								Idle RPG
							</span>
						</div>
						<h1 className="font-display text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight text-glow-gold mt-4">
							Enter the<br />Realm
						</h1>
						<p className="text-base text-muted-foreground leading-relaxed max-w-md">
							Connect your Hive account to command your raiders, conquer dungeons,
							collect rare cards, and climb the global leaderboards.
						</p>
					</div>

					<div className="space-y-3">
						{BULLETS.map((b) => (
							<Bullet key={b.label} label={b.label} />
						))}
					</div>

					<div className="pt-2">
						<a
							href="https://hive-keychain.com"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
						>
							<ExternalLink size={12} />
							Don&apos;t have Hive Keychain? Get it here
						</a>
					</div>
				</motion.div>

				{/* Login card side */}
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="w-full max-w-md mx-auto lg:mx-0 space-y-4"
				>
					<LoginCard />

					{/* Legal links */}
					<div className="flex items-center justify-center gap-4 pt-1">
						<button
							onClick={() => setTermsOpen(true)}
							className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors inline-flex items-center gap-1"
						>
							<FileText size={10} /> Terms
						</button>
						<span className="text-muted-foreground/20 text-xs">·</span>
						<button
							onClick={() => setPrivacyOpen(true)}
							className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors inline-flex items-center gap-1"
						>
							<ShieldCheck size={10} /> Privacy
						</button>
					</div>
				</motion.div>
			</section>

			{/* Legal modals */}
			<LegalModal open={termsOpen} onClose={() => setTermsOpen(false)} title="Terms & Conditions">
				<p>
					<strong className="text-foreground">Last Updated:</strong> March 8, 2026
				</p>
				<p>
					Welcome to Idle Raiders. By accessing or playing the game, you agree to be bound by these Terms and
					Conditions.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">1. Acceptance of Terms</h4>
				<p>
					By creating an account or playing Idle Raiders, you acknowledge that you have read, understood, and
					agree to these Terms.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">2. Game Assets & Virtual Items</h4>
				<p>
					All in-game items, cards, currencies (Realm Coins, Soul Shards), and other virtual assets are the
					property of Idle Raiders. Virtual items have no real-world monetary value outside of the Hive
					blockchain ecosystem.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">3. User Accounts</h4>
				<p>
					You are responsible for maintaining the security of your account credentials. You must not share,
					sell, or transfer your account.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">4. Fair Play</h4>
				<p>Use of bots, automation tools, exploits, or any form of cheating is strictly prohibited.</p>
				<h4 className="font-display font-bold text-foreground !mt-5">5. Marketplace Transactions</h4>
				<p>
					All marketplace transactions are final once confirmed. Idle Raiders is not responsible for trades
					conducted between players.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">6. Modifications</h4>
				<p>
					We reserve the right to modify game mechanics, stats, reward formulas, and card balances at any
					time.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">7. Contact</h4>
				<p>For questions, contact us at support@idleraiders.site.</p>
			</LegalModal>

			<LegalModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy Policy">
				<p>
					<strong className="text-foreground">Last Updated:</strong> March 8, 2026
				</p>
				<p>This Privacy Policy describes how Idle Raiders collects, uses, and protects your information.</p>
				<h4 className="font-display font-bold text-foreground !mt-5">1. Information We Collect</h4>
				<p>
					We collect your Hive blockchain username and public key for authentication, plus gameplay data
					including mission history, card collections, and achievement progress.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">2. How We Use Your Information</h4>
				<p>
					To provide the game service, display leaderboards, process marketplace transactions, and improve
					game balance.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">3. Data Storage</h4>
				<p>
					Game data is stored securely and associated with your Hive account. Blockchain transactions are
					publicly visible on the Hive blockchain.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">4. Third-Party Services</h4>
				<p>
					We integrate with the Hive blockchain for authentication. We do not sell your personal data to third
					parties.
				</p>
				<h4 className="font-display font-bold text-foreground !mt-5">5. Cookies & Local Storage</h4>
				<p>We use browser local storage for game preferences. No tracking cookies are used for advertising.</p>
				<h4 className="font-display font-bold text-foreground !mt-5">6. Contact</h4>
				<p>For privacy inquiries, contact us at privacy@idleraiders.site.</p>
			</LegalModal>
		</div>
	)
}

const LoginPageWrapper = () => (
	<Suspense fallback={null}>
		<LoginPage />
	</Suspense>
)

export default LoginPageWrapper
