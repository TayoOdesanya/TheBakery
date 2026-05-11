import { Link } from 'react-router-dom'
import { ChefHat } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#252525] text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-white mb-3">
              <ChefHat className="h-6 w-6" />
              <span className="font-bold text-lg">The Bakery</span>
            </div>
            <p className="text-sm leading-relaxed">
              Freshly baked goods made with care and delivered to your door.
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

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <p>&copy; {new Date().getFullYear()} The Bakery. All rights reserved.</p>
          <p>Registered in England &amp; Wales</p>
        </div>
      </div>
    </footer>
  )
}
