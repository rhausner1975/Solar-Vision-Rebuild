import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/source/hero-ground-mount-install.jpg";
import builderImg from "@/assets/source/commercial-rooftop-array.jpg";
import reliabilityImg from "@/assets/source/crew-installing-frame.jpg";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Vision9 Solar Inc. | Ontario Solar Installation</title>
        <meta name="description" content="Vision9 Solar Inc. provides net-metering and off-grid solar solutions for residential and commercial properties in Ontario." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-background py-16 md:py-24 overflow-hidden relative">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              Off Grid Solar &<br />
              <span className="text-primary">Net Metering</span> Solutions
            </h1>
            <p className="text-lg text-secondary mb-8 max-w-lg">
              Professional solar installations for homes, businesses, and remote properties. Built by engineers with real-world operations & maintenance experience.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="font-semibold rounded">
                <Link href="/estimates">Get an Estimate</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-semibold rounded">
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>
          <div className="relative z-10">
            <img src={heroImg} alt="Vision9 Solar ground-mount array installation at golden hour in rural Ontario" className="w-full h-auto rounded-lg shadow-2xl object-cover aspect-[4/3]" loading="eager" />
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Solutions for Builders & Developers</h2>
            <p className="text-secondary text-lg">
              We specialize in providing remote power solutions that open up new possibilities for your clients' dream properties.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img src={builderImg} alt="Vision9 Solar commercial rooftop solar array — Kirkland Lake, Ontario" className="w-full h-72 rounded shadow-lg object-cover" loading="lazy" />
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <h3 className="text-2xl font-bold text-foreground">Hassel-Free Power Anywhere</h3>
              <p className="text-secondary">
                No longer limited to having access to local utilities. We enable you to build dream cottages, homes, or luxury getaways wherever your clients desire.
              </p>
              <ul className="space-y-3">
                {[
                  "Opens new markets and opportunities",
                  "Meets sustainable, eco-friendly demands",
                  "Cost-effective, efficient remote power",
                  "Demonstrates ESG commitment",
                  "Industry-leading reliability"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="link" className="px-0 text-primary hover:text-primary/80 font-semibold">
                <Link href="/about" className="flex items-center gap-2">
                  Learn about our expertise <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Reliability Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-foreground">Expertise You Can Count On</h2>
              <p className="text-secondary">
                Our team brings together technicians with diverse backgrounds in mechanical engineering, automotive R&D, and IT networking. We've spent years in the field maintaining commercial solar sites, giving us deep insight into how build choices affect long-term reliability.
              </p>
              <p className="text-secondary">
                We design with failure mode analysis in mind, building top-tier systems with redundancies that work with minimal maintenance in remote locations.
              </p>
              <Button asChild size="lg" className="mt-4 rounded font-semibold">
                <Link href="/contact">Contact Our Team</Link>
              </Button>
            </div>
            <div>
              <img src={reliabilityImg} alt="Vision9 Solar crew assembling a residential ground-mount system" className="w-full h-96 rounded shadow-lg object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-foreground text-background text-center relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to power your next project?</h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Whether you need a net-metering system for your home or a robust off-grid solution for a remote build, our engineers are ready to help.
          </p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-sm px-8">
            <Link href="/estimates">Request an Estimate</Link>
          </Button>
        </div>
      </section>
    </>
  );
}