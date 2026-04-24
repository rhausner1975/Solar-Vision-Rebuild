import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCircle2, Image as ImageIcon, Sparkles } from "lucide-react";
import { useListPublicGalleries } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Reveal, StaggerChildren, StaggerItem, Counter } from "@/components/motion";
import heroImg from "@/assets/source/hero-ground-mount-install.jpg";
import builderImg from "@/assets/source/commercial-rooftop-array.jpg";
import reliabilityImg from "@/assets/source/crew-installing-frame.jpg";

const STATS = [
  { value: 10, suffix: "+", label: "Years of field experience" },
  { value: 100, suffix: "+", label: "Solar installations supported" },
  { value: 2, suffix: "", label: "Ontario offices serving you" },
];

export default function Home() {
  const { data: galleries, isLoading: galleriesLoading } = useListPublicGalleries();
  const recentGalleries = galleries ? [...galleries].slice(-4).reverse() : [];

  return (
    <>
      <Helmet>
        <title>Vision9 Solar Inc. | Ontario Solar Installation</title>
        <meta name="description" content="Vision9 Solar Inc. provides net-metering and off-grid solar solutions for residential and commercial properties in Ontario." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-background py-20 md:py-28 lg:py-32 overflow-hidden relative">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="z-10">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 leading-[1.05] tracking-tight">
              Off Grid Solar &<br />
              <span className="text-primary">Net Metering</span> Solutions
            </h1>
            <p className="text-lg md:text-xl text-secondary mb-10 max-w-lg leading-relaxed">
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
          </Reveal>
          <Reveal className="relative z-10" delay={0.15}>
            <img src={heroImg} alt="Vision9 Solar ground-mount array installation at golden hour in rural Ontario" className="w-full h-auto rounded-lg shadow-2xl object-cover aspect-[4/3]" loading="eager" />
          </Reveal>
        </div>
      </section>

      {/* Stat Strip */}
      <section className="bg-foreground text-background py-14 md:py-16 border-y border-foreground/20">
        <div className="container mx-auto px-4">
          <StaggerChildren
            className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 text-center"
            staggerDelay={0.12}
          >
            {STATS.map((stat, i) => (
              <StaggerItem key={i} className="px-4">
                <div className="text-5xl md:text-6xl font-extrabold text-primary mb-3 leading-none tabular-nums">
                  <Counter
                    to={stat.value}
                    suffix={stat.suffix}
                    duration={1.6}
                    data-testid={`home-stat-${i}`}
                  />
                </div>
                <p className="text-sm md:text-base text-gray-300 font-medium tracking-wide uppercase">
                  {stat.label}
                </p>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-24 md:py-28 bg-muted">
        <div className="container mx-auto px-4">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">Solutions for Builders & Developers</h2>
            <p className="text-secondary text-lg">
              We specialize in providing remote power solutions that open up new possibilities for your clients' dream properties.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Reveal className="order-2 md:order-1">
              <img src={builderImg} alt="Vision9 Solar commercial rooftop solar array — Kirkland Lake, Ontario" className="w-full h-72 md:h-96 rounded shadow-lg object-cover" loading="lazy" />
            </Reveal>
            <Reveal className="order-1 md:order-2 space-y-6" delay={0.1}>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">Hassle-Free Power Anywhere</h3>
              <p className="text-secondary text-lg leading-relaxed">
                No longer limited to having access to local utilities. We enable you to build dream cottages, homes, or luxury getaways wherever your clients desire.
              </p>
              <StaggerChildren as="ul" className="space-y-3" staggerDelay={0.06}>
                {[
                  "Opens new markets and opportunities",
                  "Meets sustainable, eco-friendly demands",
                  "Cost-effective, efficient remote power",
                  "Demonstrates ESG commitment",
                  "Industry-leading reliability"
                ].map((item, i) => (
                  <StaggerItem key={i} as="li" className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </StaggerItem>
                ))}
              </StaggerChildren>
              <Button asChild variant="link" className="px-0 text-primary hover:text-primary/80 font-semibold">
                <Link href="/about" className="flex items-center gap-2">
                  Learn about our expertise <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Reliability Section */}
      <section className="py-24 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Reveal className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">Expertise You Can Count On</h2>
              <p className="text-secondary text-lg leading-relaxed">
                Our team brings together technicians with diverse backgrounds in mechanical engineering, automotive R&D, and IT networking. We've spent years in the field maintaining commercial solar sites, giving us deep insight into how build choices affect long-term reliability.
              </p>
              <p className="text-secondary text-lg leading-relaxed">
                We design with failure mode analysis in mind, building top-tier systems with redundancies that work with minimal maintenance in remote locations.
              </p>
              <Button asChild size="lg" className="mt-4 rounded font-semibold">
                <Link href="/contact">Contact Our Team</Link>
              </Button>
            </Reveal>
            <Reveal delay={0.1}>
              <img src={reliabilityImg} alt="Vision9 Solar crew assembling a residential ground-mount system" className="w-full h-96 md:h-[28rem] rounded shadow-lg object-cover" loading="lazy" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Modular Racking Callout */}
      <section className="bg-background py-16 md:py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <Link
              href="/modular-racking"
              className="group block rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors duration-300 p-6 md:p-10"
              data-testid="home-modular-racking-callout"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                <div className="shrink-0 h-14 w-14 md:h-16 md:w-16 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <Sparkles className="h-7 w-7 md:h-8 md:w-8" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary mb-2">
                    Introducing — Vision9 Modular Racking
                  </p>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight mb-2">
                    A modular solar racking system, built from 10 years in the field.
                  </h2>
                  <p className="text-secondary text-base md:text-lg leading-relaxed">
                    Seasonal angle adjustment. 2-person installation. Snow-load
                    engineered for Canadian winters.
                  </p>
                </div>
                <div className="shrink-0 hidden md:flex items-center gap-2 text-primary font-semibold group-hover:translate-x-1 transition-transform duration-200">
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
              <div className="md:hidden mt-4 inline-flex items-center gap-2 text-primary font-semibold group-hover:translate-x-1 transition-transform duration-200">
                Learn more
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Recent Projects Section */}
      {(galleriesLoading || recentGalleries.length > 0) && (
        <section className="py-24 md:py-28 bg-muted">
          <div className="container mx-auto px-4">
            <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">Recent Projects</h2>
                <p className="text-secondary text-lg max-w-2xl">
                  A look at some of our latest installations across Ontario.
                </p>
              </div>
              <Button asChild variant="link" className="px-0 text-primary hover:text-primary/80 font-semibold self-start md:self-auto">
                <Link href="/galleries" className="flex items-center gap-2">
                  View all projects <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Reveal>

            {galleriesLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-background rounded-lg h-64 border border-border"></div>
                ))}
              </div>
            ) : (
              <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.08}>
                {recentGalleries.map((gallery) => {
                  const coverImage = gallery.images[0];
                  return (
                    <StaggerItem key={gallery.id}>
                      <Link
                        href={`/galleries/${gallery.slug}`}
                        className="group block bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 hover-elevate h-full"
                      >
                        <div className="aspect-[4/3] bg-muted relative overflow-hidden flex items-center justify-center">
                          {coverImage ? (
                            <img
                              src={`/api/storage${coverImage.objectPath}`}
                              alt={coverImage.altText || gallery.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{gallery.title}</h3>
                          {gallery.location && (
                            <p className="text-sm font-medium text-primary">{gallery.location}</p>
                          )}
                        </div>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerChildren>
            )}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-28 md:py-32 bg-foreground text-background text-center relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">Ready to power your next project?</h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Whether you need a net-metering system for your home or a robust off-grid solution for a remote build, our engineers are ready to help.
            </p>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-sm px-8 transition-transform duration-200 hover:-translate-y-0.5">
              <Link href="/estimates">Request an Estimate</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
