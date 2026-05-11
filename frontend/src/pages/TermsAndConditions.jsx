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

export default function TermsAndConditions() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 2025</p>

        <Section title="About these terms">
          <p>
            These terms govern your use of The Bakery website and the purchase of products from us.
            By placing an order you agree to be bound by these terms. Please read them carefully.
          </p>
          <p>
            The Bakery is registered in England and Wales. You can contact us at{' '}
            <a href="mailto:hello@thebakery.co.uk" className="text-primary-600 hover:underline">
              hello@thebakery.co.uk
            </a>.
          </p>
        </Section>

        <Section title="Placing an order">
          <p>
            When you place an order through our website you are making an offer to purchase the
            selected products. A contract is formed when we confirm your order by email or SMS.
          </p>
          <p>
            We reserve the right to refuse or cancel any order — for example if a product is out
            of stock, if there is a pricing error, or if we cannot verify your payment. In such
            cases we will notify you promptly and issue a full refund if payment has been taken.
          </p>
        </Section>

        <Section title="Pricing and payment">
          <p>
            All prices are displayed in pounds sterling (£) and include VAT where applicable.
            We reserve the right to change prices at any time, but changes will not affect orders
            already confirmed.
          </p>
          <p>
            Payment is taken in full at the time of ordering via our secure payment provider.
            We do not store card details.
          </p>
        </Section>

        <Section title="Delivery">
          <p>
            Delivery is available to addresses within the United Kingdom. Estimated delivery
            timeframes are provided at checkout and are indicative only — we are not liable for
            delays caused by third-party couriers or circumstances beyond our reasonable control.
          </p>
          <p>
            Risk in goods passes to you upon delivery. It is your responsibility to ensure
            someone is available to receive temperature-sensitive goods promptly.
          </p>
          <p>
            A minimum order value of £10.00 applies to delivery orders.
          </p>
        </Section>

        <Section title="Collection">
          <p>
            If you choose collection, your order will be prepared and held for you. We will
            contact you when it is ready. Please collect within the agreed timeframe — we
            cannot be responsible for goods left uncollected.
          </p>
        </Section>

        <Section title="Cancellations and refunds">
          <p>
            As our products are perishable food items, they are exempt from the 14-day cooling-off
            period under the Consumer Contracts Regulations 2013. Orders cannot be cancelled once
            they have been prepared or dispatched.
          </p>
          <p>
            If your order arrives damaged, incorrect, or of unsatisfactory quality, please contact
            us within 24 hours of receipt. We will offer a replacement or refund in accordance
            with the Consumer Rights Act 2015. See our{' '}
            <Link to="/returns" className="text-primary-600 hover:underline">Returns Policy</Link> for details.
          </p>
        </Section>

        <Section title="Allergens">
          <p>
            Our products are made in a kitchen that handles all 14 major allergens. Full allergen
            information is available on our{' '}
            <Link to="/allergens" className="text-primary-600 hover:underline">Allergen Information</Link>{' '}
            page. It is your responsibility to check allergen information before ordering.
          </p>
        </Section>

        <Section title="Our liability">
          <p>
            We are not liable for any indirect or consequential losses arising from your use of
            our website or products. Our total liability to you shall not exceed the value of
            the order in question.
          </p>
          <p>
            Nothing in these terms limits our liability for death or personal injury caused by
            our negligence, fraud, or any other liability that cannot be excluded by law.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of England and Wales. Any disputes will be
            subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms from time to time. The date at the top of this page
            indicates when they were last revised. Continued use of the site after changes
            constitutes acceptance of the updated terms.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
