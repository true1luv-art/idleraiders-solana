"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OuterPanel } from "components/ui/Panel";

export default function PrivacyPage() {
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
            Privacy Policy
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
              1. Introduction
            </h2>
            <p className="text-brown-100 text-shadow text-sm">
              Hearthvale (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
              respects your privacy. This policy explains how we collect, use,
              store, and protect your information. Your privacy is important to
              us, and we are committed to being transparent about our data
              practices.
            </p>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              2. Information We Collect
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Account Information:</strong>{" "}
                Username, email address, and profile data you provide during
                registration
              </li>
              <li>
                <strong className="text-white">Hive Account Data:</strong> Hive
                username and your public blockchain interactions
              </li>
              <li>
                <strong className="text-white">Gameplay Data:</strong> Progress,
                achievements, trades, crafting activities, and in-game behavior
              </li>
              <li>
                <strong className="text-white">Technical Data:</strong> IP
                address, device information, browser type, operating system, and
                server logs
              </li>
              <li>
                <strong className="text-white">Analytics:</strong> How you use
                the game, which features you access, playtime, and user
                preferences
              </li>
              <li>
                <strong className="text-white">Communication:</strong> Messages
                you send through contact forms or support channels
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              3. How We Use Your Data
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>Provide and improve game services</li>
              <li>Personalize your gaming experience</li>
              <li>Process game transactions and token transfers</li>
              <li>
                Communicate game updates, announcements, and important notices
              </li>
              <li>
                Prevent fraud, cheating, and enforce terms of service
              </li>
              <li>Conduct analytics and game balancing</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Comply with legal obligations</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              4. Third-Party Services
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>
                <strong className="text-white">Hive Blockchain:</strong> Your
                Hive account interactions are public on the blockchain and
                cannot be made private
              </li>
              <li>
                <strong className="text-white">Analytics Services:</strong> We
                use third-party analytics tools to understand usage patterns
              </li>
              <li>
                <strong className="text-white">Payment Processors:</strong>{" "}
                Third-party processors may handle blockchain transactions
              </li>
              <li>
                <strong className="text-white">Cloud Hosting:</strong> We use
                cloud services for data storage and server infrastructure
              </li>
              <li>
                <strong className="text-white">Authentication:</strong> Hive
                Keychain integration for secure login (Hive handles your
                authentication)
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              5. Data Security
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>
                We use industry-standard encryption (HTTPS/SSL) for data in
                transit
              </li>
              <li>We conduct regular security audits and updates</li>
              <li>
                No system is 100% secure; you use our service at your own risk
              </li>
              <li>
                We cannot be liable for unauthorized access due to third-party
                breaches
              </li>
              <li>
                You are responsible for maintaining your account credentials
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              6. Data Retention
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>Account data is retained while your account is active</li>
              <li>Deletion requests are processed within 30 days</li>
              <li>
                Some data may be retained for legal compliance or fraud
                prevention
              </li>
              <li>
                Blockchain transactions are permanent and cannot be deleted
              </li>
              <li>
                Game progression data may be retained for historical records
              </li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              7. Your Rights
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>Right to access your personal data</li>
              <li>Right to request data deletion (subject to legal holds)</li>
              <li>Right to opt-out of marketing communications</li>
              <li>Right to data portability</li>
              <li>Right to correct inaccurate information</li>
              <li>Contact us to exercise any of these rights</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              8. Children&apos;s Privacy
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>We do not knowingly collect data from children under 13</li>
              <li>
                If we discover data from children under 13, we will delete it
                and the account
              </li>
              <li>Parents may request data deletion for their children</li>
              <li>Users under 18 must have parental/guardian consent</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              9. International Data Transfer
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>
                Your data may be transferred and stored internationally
              </li>
              <li>We comply with applicable data protection laws</li>
              <li>By using our service, you consent to data transfers</li>
              <li>We maintain appropriate safeguards for transferred data</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              10. Third-Party Links
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>Our site may contain links to third-party websites</li>
              <li>We are not responsible for their privacy practices</li>
              <li>Please review third-party privacy policies separately</li>
              <li>We are not liable for data collected by external sites</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              11. Cookies & Tracking
            </h2>
            <ul className="text-brown-100 text-shadow text-sm space-y-2 list-disc list-inside">
              <li>We use cookies to enhance your gaming experience</li>
              <li>Analytics cookies help us understand usage patterns</li>
              <li>You can control cookie settings in your browser</li>
              <li>Disabling cookies may affect some features</li>
            </ul>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              12. Policy Changes
            </h2>
            <p className="text-brown-100 text-shadow text-sm">
              We may update this policy anytime. Continued use of Hearthvale
              after changes means you accept the updated policy. We will notify
              you of significant changes via email or in-game notification.
            </p>
          </OuterPanel>

          <OuterPanel className="p-6">
            <h2 className="text-xl font-bold text-white text-shadow mb-4">
              13. Contact Us
            </h2>
            <p className="text-brown-100 text-shadow text-sm">
              Privacy questions or data requests? Join our{" "}
              <a
                href="https://discord.gg/9p7N5qZcJ8"
                className="text-white hover:underline"
              >
                Discord Server
              </a>{" "}
              and ask in the support channel. You can also email:{" "}
              <a
                href="mailto:privacy@hearthvale.com"
                className="text-white hover:underline"
              >
                privacy@hearthvale.com
              </a>
            </p>
          </OuterPanel>
        </div>
      </div>
    </div>
  );
}
