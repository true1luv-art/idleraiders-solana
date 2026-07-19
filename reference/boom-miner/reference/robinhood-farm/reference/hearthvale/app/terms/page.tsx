"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OuterPanel } from "components/ui/Panel";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-brown-600 border-b-4 border-brown-700 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-brown-100 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            <span className="text-shadow">Back to Home</span>
          </Link>
          <h1 className="text-4xl font-extrabold text-white text-shadow">
            Terms & Conditions
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> February 9, 2026
        </p>

        <div className="space-y-6">
          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-brown-100 text-shadow text-sm">
              By accessing and using Hearthvale, you accept and agree to be
              bound by these Terms and Conditions. If you do not agree to these
              terms, please do not use this service.
            </p>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              2. Eligibility
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>You must be at least 13 years old to use this service</li>
              <li>Users under 18 need parental/guardian consent</li>
              <li>
                You are responsible for maintaining account confidentiality
              </li>
              <li>
                You agree to provide accurate and truthful information during
                registration
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              3. User Responsibilities
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>You are responsible for all activity on your account</li>
              <li>You may not use accounts for illegal purposes</li>
              <li>No account sharing, botting, or automated play</li>
              <li>
                You agree to follow our community guidelines and maintain
                respectful behavior
              </li>
              <li>
                You are responsible for notifying us of unauthorized account
                access
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              4. Intellectual Property & Attribution
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Assets:</strong> Game assets are
                based on Daniel Diggle&apos;s SunnySide Asset Pack and are used
                according to the asset license. Daniel Diggle retains copyright
                to the artwork.
              </li>
              <li>
                <strong className="text-white">Game Mechanics:</strong> Game
                farming mechanics are inspired by and based on
                Sunflower Land&apos;s gameplay design.
              </li>
              <li>
                <strong className="text-white">Hearthvale IP:</strong>{" "}
                Hearthvale branding, game code, and custom mechanics are owned
                by Hearthvale.
              </li>
              <li>
                <strong className="text-white">Blockchain/Game Token:</strong>{" "}
                Only the game token operates on the Hive blockchain. Asset-based
                NFTs are not used or minted on-chain.
              </li>
              <li>
                <strong className="text-white">Frontend Usage:</strong> All
                visual assets are used exclusively for frontend gameplay and
                user interface.
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              5. Blockchain & Game Token Disclaimer
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>Blockchain transactions are irreversible</li>
              <li>
                Hearthvale is not responsible for blockchain network failures
              </li>
              <li>
                Cryptocurrency and game token markets are volatile and carry
                risk
              </li>
              <li>
                You assume all financial risk related to game token holdings
              </li>
              <li>Game tokens have no guaranteed value or liquidity</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              6. Limitation of Liability
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>
                Hearthvale is provided &quot;as-is&quot; without warranties of
                any kind
              </li>
              <li>
                We are not liable for data loss, service interruptions, or
                damages
              </li>
              <li>User assumes all risks related to blockchain usage</li>
              <li>We are not responsible for third-party service failures</li>
              <li>
                Maximum liability is limited to amounts paid by user, if any
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              7. Account Suspension/Termination
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>
                We reserve the right to suspend or terminate accounts violating
                these terms
              </li>
              <li>
                Cheating, hacking, or exploiting will result in permanent bans
              </li>
              <li>Game tokens in banned accounts may be confiscated</li>
              <li>Harassment or abusive behavior will not be tolerated</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              8. Changes to Terms
            </h2>
            <p className="text-brown-100 text-shadow text-sm">
              We may update these terms at any time. Your continued use of
              Hearthvale after changes constitutes acceptance of the new terms.
              We will notify users of significant changes.
            </p>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              9. Dispute Resolution
            </h2>
            <p className="text-brown-100 text-shadow text-sm">
              Disputes will be resolved through binding arbitration or
              jurisdiction applicable to Hearthvale operations. You agree to
              waive class action rights and resolve disputes individually.
            </p>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              10. Contact
            </h2>
            <p className="text-brown-100 text-shadow text-sm">
              For questions regarding these terms, join our{" "}
              <a
                href="https://discord.gg/9p7N5qZcJ8"
                className="text-white hover:underline"
              >
                Discord Server
              </a>{" "}
              and ask in the support channel. Alternatively, you can reach us at{" "}
              <a
                href="mailto:legal@hearthvale.com"
                className="text-white hover:underline"
              >
                legal@hearthvale.com
              </a>
            </p>
          </OuterPanel>
        </div>
      </div>
    </div>
  );
}
