import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#252525] text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-3 mb-3">
              <img src="/rad-logo.png" alt="R's Confectionery" className="h-12 w-auto" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ff9f32]">R's</p>
                <span className="font-black uppercase text-white text-lg">Confectionery</span>
              </div>
            </a>
            <p className="text-sm leading-relaxed">
              Handcrafted sweets and confections made with care, for every occasion.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link to="/returns" className="hover:text-white transition-colors">Returns &amp; Refunds</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Information</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/allergens" className="hover:text-white transition-colors">Allergen Information</Link></li>
              <li>
                <a href="mailto:hello@thebakery.co.uk" className="hover:text-white transition-colors">
                  hello@thebakery.co.uk
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs md:mt-10">
          <p>&copy; {new Date().getFullYear()} R's Confectionery. All rights reserved.</p>
          <p>Registered in England &amp; Wales</p>
        </div>
      </div>
    </footer>
  )
}
