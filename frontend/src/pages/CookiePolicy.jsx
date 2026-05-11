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

export default function CookiePolicy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 2025</p>

        <Section title="What are cookies?">
          <p>
            Cookies are small text files placed on your device when you visit a website. They
            allow the site to remember information about your visit, such as whether you are
            logged in.
          </p>
        </Section>

        <Section title="Cookies we use">
          <p>
            We only use <strong>strictly necessary cookies</strong>. These are essential for
            the website to function and cannot be switched off.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-900">Cookie</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-900">Purpose</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-900">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-white">
                  <td className="px-4 py-2 font-mono text-xs">auth_token</td>
                  <td className="px-4 py-2">Keeps you logged in to your account</td>
                  <td className="px-4 py-2">Session / 7 days</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">cart</td>
                  <td className="px-4 py-2">Remembers your shopping cart contents</td>
                  <td className="px-4 py-2">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">
            We do not use analytics, advertising, or any third-party tracking cookies.
          </p>
        </Section>

        <Section title="Managing cookies">
          <p>
            Because we only use strictly necessary cookies, we are not required to obtain your
            consent for them under the UK Privacy and Electronic Communications Regulations
            (PECR). You cannot opt out of these cookies and continue to use the site, as they
            are essential for it to work.
          </p>
          <p>
            You can clear cookies at any time through your browser settings, but doing so will
            log you out of your account. Refer to your browser's help documentation for
            instructions:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Apple Safari</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Microsoft Edge</a></li>
          </ul>
        </Section>

        <Section title="More information">
          <p>
            For more information on how we handle your personal data, see our{' '}
            <Link to="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
            If you have questions about our use of cookies, contact us at{' '}
            <a href="mailto:hello@thebakery.co.uk" className="text-primary-600 hover:underline">
              hello@thebakery.co.uk
            </a>.
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  )
}
