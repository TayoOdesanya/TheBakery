import { Link } from 'react-router-dom'
import { ChefHat, AlertTriangle } from 'lucide-react'
import Footer from '../components/Footer'

const ALLERGENS = [
  { name: 'Gluten', detail: 'Wheat, rye, barley, oats and their hybridised strains' },
  { name: 'Crustaceans', detail: 'Prawns, crabs, lobster, crayfish' },
  { name: 'Eggs', detail: 'Including egg derivatives' },
  { name: 'Fish', detail: 'Including fish derivatives' },
  { name: 'Peanuts', detail: 'Including peanut oil and peanut flour' },
  { name: 'Soybeans', detail: 'Including soy-based products' },
  { name: 'Milk', detail: 'Including lactose and dairy derivatives' },
  { name: 'Nuts', detail: 'Almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamia nuts' },
  { name: 'Celery', detail: 'Including celeriac and celery seeds' },
  { name: 'Mustard', detail: 'Including mustard seeds, leaves and oil' },
  { name: 'Sesame', detail: 'Including sesame oil and tahini' },
  { name: 'Sulphur dioxide & sulphites', detail: 'At concentrations of more than 10mg/kg or 10mg/litre' },
  { name: 'Lupin', detail: 'Including lupin flour and seeds' },
  { name: 'Molluscs', detail: 'Clams, mussels, oysters, scallops, squid' },
]

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-700 space-y-3 leading-relaxed">{children}</div>
    </section>
  )
}

export default function AllergenInfo() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Allergen Information</h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: May 2025</p>

        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 mb-10 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-amber-900 text-sm leading-relaxed">
            <p className="font-semibold mb-1">Important — please read before ordering</p>
            <p>
              All of our products are made in a kitchen that handles all 14 major allergens
              listed below. We cannot guarantee that any product is completely free from
              traces of allergens due to the risk of cross-contamination.
            </p>
            <p className="mt-2">
              If you have a severe allergy or anaphylaxis risk, please contact us at{' '}
              <a href="mailto:hello@thebakery.co.uk" className="underline font-medium">
                hello@thebakery.co.uk
              </a>{' '}
              before placing an order so we can advise you appropriately.
            </p>
          </div>
        </div>

        <Section title="The 14 major allergens">
          <p>
            Under UK food law (Food Information Regulations 2014), we are required to declare
            the presence of any of the following 14 allergens in our products:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {ALLERGENS.map(({ name, detail }) => (
              <div key={name} className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900 text-sm">{name}</p>
                <p className="text-xs text-gray-500 mt-1">{detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Product-specific allergen information">
          <p>
            Allergen details for individual products are displayed on each product listing on
            our menu. These are updated whenever a recipe changes.
          </p>
          <p>
            If you cannot see allergen information for a specific product, or if you need
            information in a different format, please contact us before ordering.
          </p>
        </Section>

        <Section title="Cross-contamination">
          <p>
            Our kitchen is not allergen-free. We use shared equipment and preparation surfaces,
            which means there is always a risk of cross-contamination even in products that do
            not contain a given allergen as an ingredient.
          </p>
          <p>
            Customers with severe allergies should carefully consider this risk before ordering.
            We recommend speaking with us directly if you have any concerns.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            For allergen queries, contact us at{' '}
            <a href="mailto:hello@thebakery.co.uk" className="text-primary-600 hover:underline">
              hello@thebakery.co.uk
            </a>. We aim to respond within one business day.
          </p>
          <p>
            For general food safety information, visit the{' '}
            <a
              href="https://www.food.gov.uk/safety-hygiene/food-allergies-and-intolerances"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 hover:underline"
            >
              Food Standards Agency
            </a>.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
