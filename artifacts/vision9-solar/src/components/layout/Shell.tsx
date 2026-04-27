import { Link, useLocation } from "wouter";
import { Menu, X, Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/source/Asset-3.png";
import { OFFICES, SITE_CONTACT } from "@/lib/siteContact";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/net-metering", label: "Net Metering" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/modular-racking", label: "Modular Racking" },
  { href: "/estimates", label: "Estimates" },
  { href: "/galleries", label: "Galleries" },
  { href: "/contact", label: "Contact" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      {/* Top Utility Strip */}
      <div className="bg-primary text-primary-foreground text-sm font-medium py-2 px-4 flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-2">
        <span>{SITE_CONTACT.topBarTagline}</span>
        <a href={`tel:${SITE_CONTACT.primaryPhoneTel}`} className="hover:underline flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Call: {SITE_CONTACT.primaryPhoneDisplay}
        </a>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={logo} alt="Vision9 Solar" className="h-12 object-contain" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => {
              const isActive = location === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative text-sm font-semibold tracking-wide transition-colors duration-200 hover:text-primary ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {link.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-0.5 bg-primary transition-all duration-300 ease-out ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border bg-background p-4 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-semibold py-2 transition-colors hover:text-primary ${
                  location === link.href ? "text-primary" : "text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <img src={logo} alt="Vision9 Solar" className="h-12 object-contain brightness-0 invert opacity-90 mb-6" />
            <p className="text-gray-300 max-w-sm mb-6">
              Expert solar installations, net-metering systems, off-grid power solutions, and IT consulting for Ontario.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">Contact</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 shrink-0 text-primary" />
                <a href={`tel:${SITE_CONTACT.primaryPhoneTel}`} className="hover:text-primary transition-colors">{SITE_CONTACT.primaryPhoneDisplay}</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <a href={SITE_CONTACT.emailHref} className="hover:text-primary transition-colors">{SITE_CONTACT.emailDisplay}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-white">Offices</h3>
            <ul className="space-y-4 text-gray-300">
              {OFFICES.map((office) => (
                <li key={office.id} className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-white">{office.region}</p>
                    {office.street ? <p>{office.street}</p> : null}
                    <p>{office.locality}, {office.province} {office.postalCode}</p>
                    {office.phoneTel && office.phoneDisplay ? (
                      <a
                        href={`tel:${office.phoneTel}`}
                        className="inline-flex items-center gap-2 mt-1 hover:text-primary transition-colors"
                      >
                        <Phone className="h-4 w-4 text-primary" />
                        <span>{office.phoneDisplay}</span>
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Vision9 Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}