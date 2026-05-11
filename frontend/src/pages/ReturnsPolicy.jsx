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

export default function ReturnsPolicy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Returns &amp; Refund Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 2025</p>

        <Section title="Perishable goods">
          <p>
            Our products are freshly made, perishable food items. Under the Consumer Contracts
            Regulations 2013, there is no general right to cancel or return food products once
            they have been prepared or dispatched.
          </p>
          <p>
            We are unable to accept returns of food products for hygiene and safety reasons.
          </p>
        </Section>

        <Section title="Damaged, incorrect, or poor-quality orders">
          <p>
            Under the Consumer Rights Act 2015, you are entitled to a remedy if your goods are:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Not as described (e.g., wrong item sent)</li>
            <li>Not of satisfactory quality (e.g., arrived damaged or inedible)</li>
            <li>Not fit for purpose</li>
          </ul>
          <p>
            If your order falls into any of these categories, please contact us within{' '}
            <strong>24 hours of receiving your order</strong> with:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your order reference number</li>
            <li>A description of the issue</li>
            <li>A photograph where relevant</li>
          </ul>
          <p>
            Email us at{' '}
            <a href="mailto:hello@thebakery.co.uk" className="text-primary-600 hover:underline">
              hello@thebakery.co.uk
            </a>{' '}
            with the subject line <em>"Order Issue — [your order reference]"</em>.
          </p>
        </Section>

        <Section title="What we will do">
          <p>
            Once we have reviewed your request, we will offer one of the following at our discretion:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>A replacement order dispatched at no additional cost</li>
            <li>A full or partial refund to your original payment method</li>
            <li>Credit towards a future order</li>
          </ul>
          <p>
            We aim to resolve all issues within 2 business days of receiving your report.
          </p>
        </Section>

        <Section title="Refund processing times">
          <p>
            Approved refunds are returned to your original payment method. Processing times
            depend on your bank or card provider, but typically take <strong>3–5 working days</strong>{' '}
            to appear in your account after we have issued the refund.
          </p>
        </Section>

        <Section title="Delivery issues">
          <p>
            If your order has not arrived within the estimated delivery window, please contact us.
            We will liaise with the courier on your behalf. Note that delivery timeframes are
            estimates and delays caused by third-party couriers are outside our direct control,
            though we will do our best to resolve the situation promptly.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            For any issues with your order, contact us at{' '}
            <a href="mailto:hello@thebakery.co.uk" className="text-primary-600 hover:underline">
              hello@thebakery.co.uk
            </a>. Please include your order reference number in all correspondence.
          </p>
          <p>
            For more on your consumer rights, visit the{' '}
            <a
              href="https://www.citizensadvice.org.uk/consumer/changed-your-mind/changing-your-mind-about-something-youve-bought/"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 hover:underline"
            >
              Citizens Advice
            </a>{' '}
            website.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
