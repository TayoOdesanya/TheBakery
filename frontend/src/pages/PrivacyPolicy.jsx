import { Link } from 'react-router-dom'
import { ChefHat } from 'lucide-react'
import Footer from '../components/Footer'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-700 space-y-3 leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary-600">
            <ChefHat className="h-6 w-6" />
            The Bakery
          </Link>
          <Link to="/menu" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            ← Back to menu
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 2025</p>

        <Section title="Who we are">
          <p>
            The Bakery ("we", "us", "our") is the data controller for personal data collected through
            this website. We are registered in England and Wales. If you have any questions about
            how we handle your data, contact us at{' '}
            <a href="mailto:hello@thebakery.co.uk" className="text-primary-600 hover:underline">
              hello@thebakery.co.uk
            </a>.
          </p>
        </Section>

        <Section title="What data we collect">
          <p>When you place an order we collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name and contact phone number</li>
            <li>Your email address (used to send your account invite and order notifications)</li>
            <li>Your delivery address (for delivery orders)</li>
            <li>Your order history and payment confirmation records</li>
          </ul>
          <p>We do not store payment card details — payments are handled securely by our payment processor.</p>
        </Section>

        <Section title="How we use your data">
          <p>We use your personal data to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Process and fulfil your orders</li>
            <li>Send you order confirmations and delivery updates</li>
            <li>Contact you if there is a problem with your order</li>
            <li>Comply with our legal and tax obligations</li>
          </ul>
          <p>
            Our lawful basis is <strong>performance of a contract</strong> (Article 6(1)(b) UK GDPR) — we
            need your data to process and deliver your order.
          </p>
        </Section>

        <Section title="How long we keep your data">
          <p>
            We retain order records for 6 years in line with HMRC requirements. Account data is
            kept for as long as your account is active. You may request deletion of your account
            and personal data at any time (see Your Rights below).
          </p>
        </Section>

        <Section title="Who we share your data with">
          <p>We share your data only where necessary:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Royal Mail / courier</strong> — your name and delivery address to fulfil shipments
            </li>
            <li>
              <strong>Payment processor</strong> — to securely handle your payment
            </li>
            <li>
              <strong>SMS / email notification provider</strong> — to send order updates
            </li>
          </ul>
          <p>We do not sell your data to third parties.</p>
        </Section>

        <Section title="Your rights">
          <p>Under UK GDPR you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access</strong> — request a copy of the data we hold about you</li>
            <li><strong>Rectification</strong> — ask us to correct inaccurate data</li>
            <li><strong>Erasure</strong> — ask us to delete your data (subject to legal retention obligations)</li>
            <li><strong>Restriction</strong> — ask us to limit how we use your data</li>
            <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Object</strong> — object to processing based on legitimate interests</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href="mailto:hello@thebakery.co.uk" className="text-primary-600 hover:underline">
              hello@thebakery.co.uk
            </a>. We will respond within one month.
          </p>
          <p>
            You also have the right to lodge a complaint with the Information Commissioner's Office (ICO)
            at <a href="https://ico.org.uk" className="text-primary-600 hover:underline" target="_blank" rel="noreferrer">ico.org.uk</a>.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use essential cookies to keep you logged in during your session. See our{' '}
            <Link to="/cookie-policy" className="text-primary-600 hover:underline">Cookie Policy</Link>{' '}
            for full details.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. The date at the top of this page shows when
            it was last revised. Continued use of the site after changes constitutes acceptance of the
            updated policy.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
