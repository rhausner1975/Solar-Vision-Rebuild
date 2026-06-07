import { useRef } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Image as ImageIcon, HardHat, Users, Snowflake, MapPin } from "lucide-react";
import { useListPublicGalleries } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Reveal, StaggerChildren, StaggerItem, Counter } from "@/components/motion";
import builderImg from "@/assets/source/builder-feature.webp";
import commercialScaleImg from "@/assets/source/commercial-ground-mount-build.jpg";
import modularRackingV3Img from "@/assets/source/modular-racking-v3-field-install.jpg";
import netMeteringImg from "@/assets/source/net-metering-residential.jpg";
import modularRackingIcon from "@/assets/source/modular-racking-icon.svg";
import modularFlatImg from "@/assets/source/modular-flat-transport.jpg";
import modular45Img from "@/assets/source/modular-45-spring-fall.jpg";
import modular28Img from "@/assets/source/modular-28-summer.jpg";

const STATS = [
  { value: 10, suffix: "+", label: "Years of field experience" },
  { value: 100, suffix: "+", label: "Solar installations supported" },
  { value: 2, suffix: "", label: "Ontario offices serving you" },
];

const EXPERTISE_PHOTOS = [
  {
    src: commercialScaleImg,
    label: "Commercial Scale",
    alt: "Vision9 Solar crew assembling a large commercial ground-mount solar array",
  },
  {
    src: modularRackingV3Img,
    label: "Modular Racking V3 — Installed & Operational",
    alt: "Vision9 Solar's Modular Racking V3 ground-mount system installed and operational in the field",
  },
  {
    src: netMeteringImg,
    label: "Net Metering",
    alt: "Residential net-metering solar installation at a home in Ontario",
  },
] as const;

const MODULAR_ANGLES = [
  {
    src: modularFlatImg,
    angle: "Flat",
    season: "Transport / Stow",
    purpose: "Laid flat for transport and storm protection.",
    alt: "Vision9 Modular Racking unit laid flat to the ground in stow position for transport",
  },
  {
    src: modular45Img,
    angle: "45°",
    season: "Spring & Fall",
    purpose: "Steep tilt to capture the low shoulder-season sun.",
    alt: "Vision9 Modular Racking unit tilted to a steep 45-degree angle for spring and fall",
  },
  {
    src: modular28Img,
    angle: "28°",
    season: "Summer · Southern Ontario",
    purpose: "Optimized summer angle for peak production.",
    alt: "Vision9 Modular Racking unit set to a 28-degree summer angle in Southern Ontario",
  },
] as const;

const CREDIBILITY = [
  { icon: HardHat, label: "Field-Proven Design", sub: "Born from a decade of solar O&M" },
  { icon: Users, label: "2-Person Installation", sub: "No specialized crew required" },
  { icon: Snowflake, label: "Snow-Load Engineered", sub: "Built for Ontario winters" },
  { icon: MapPin, label: "Ontario-Built & Supplied", sub: "Designed and made here" },
] as const;

function ExpertiseSection() {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const clusterY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">Expertise You Can Count On</h2>
            <p className="text-secondary text-lg leading-relaxed">
              From small residential net-metering sites to large commercial installations, our team brings together technicians with diverse backgrounds in mechanical engineering, automotive R&D, and IT networking. We've spent years in the field maintaining solar sites across that full range, giving us deep insight into how build choices affect long-term reliability.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              We design with failure mode analysis in mind, building top-tier systems with redundancies that work with minimal maintenance — from our Modular Racking V3 ground mounts to fully off-grid home builds in remote locations.
            </p>
            <Button asChild size="lg" className="mt-4 rounded font-semibold">
              <Link href="/contact">Contact Our Team</Link>
            </Button>
          </Reveal>

          <motion.div style={shouldReduceMotion ? undefined : { y: clusterY }}>
            <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5" staggerDelay={0.15} amount={0.2}>
              <StaggerItem className="sm:col-span-2">
                <ExpertisePhoto photo={EXPERTISE_PHOTOS[0]} className="aspect-[16/9]" />
              </StaggerItem>
              <StaggerItem>
                <ExpertisePhoto photo={EXPERTISE_PHOTOS[1]} className="aspect-[4/3] sm:aspect-square" />
              </StaggerItem>
              <StaggerItem>
                <ExpertisePhoto photo={EXPERTISE_PHOTOS[2]} className="aspect-[4/3] sm:aspect-square" />
              </StaggerItem>
            </StaggerChildren>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ExpertisePhoto({
  photo,
  className,
}: {
  photo: (typeof EXPERTISE_PHOTOS)[number];
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded shadow-lg ${className ?? ""}`}>
      <img
        src={photo.src}
        alt={photo.alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/70 to-transparent" />
      <span className="absolute bottom-3 left-3 right-3 rounded bg-background/90 px-3 py-1.5 text-xs md:text-sm font-semibold text-foreground shadow-sm">
        {photo.label}
      </span>
    </div>
  );
}

function ModularRackingSection({ id }: { id?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const photosY = useTransform(scrollYProgress, [0, 1], [70, -70]);

  return (
    <section
      id={id}
      ref={sectionRef}
      className="relative bg-background py-24 md:py-28 overflow-hidden scroll-mt-24"
    >
      <div className="container mx-auto px-4">
        <Reveal className="max-w-3xl mx-auto text-center mb-14 md:mb-16">
          <div className="flex flex-col items-center gap-5">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-background ring-1 ring-primary/25 shadow-md flex items-center justify-center">
              <img
                src={modularRackingIcon}
                alt=""
                aria-hidden="true"
                className="h-11 w-11 md:h-14 md:w-14"
              />
            </div>
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary">
              Introducing — Vision9 Modular Racking
            </p>
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight">
            One unit. Every season's angle.
          </h2>
          <p className="mt-5 text-secondary text-lg leading-relaxed">
            Our signature seasonal angle adjustment lets a single modular unit
            move from a flat stow position to the ideal tilt for spring, summer,
            and fall — no tools, no extra hardware. Engineered for Canadian
            snow loads and a 2-person installation.
          </p>
        </Reveal>

        <motion.div style={shouldReduceMotion ? undefined : { y: photosY }}>
          <StaggerChildren
            className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
            staggerDelay={0.15}
            amount={0.2}
          >
            {MODULAR_ANGLES.map((item) => (
              <StaggerItem key={item.angle}>
                <figure
                  className="group relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]"
                  data-testid={`home-modular-angle-${item.angle.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl md:text-3xl font-extrabold text-primary leading-none tabular-nums">
                        {item.angle}
                      </span>
                      <span className="text-sm md:text-base font-semibold text-white">
                        {item.season}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs md:text-sm text-gray-200 leading-snug">
                      {item.purpose}
                    </p>
                  </figcaption>
                </figure>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </motion.div>

        <Reveal className="mt-12 text-center" delay={0.1}>
          <Button
            asChild
            size="lg"
            className="font-semibold rounded transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Link
              href="/modular-racking"
              className="flex items-center gap-2"
              data-testid="home-modular-racking-callout"
            >
              Explore Modular Racking
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: galleries, isLoading: galleriesLoading } = useListPublicGalleries();
  const recentGalleries = galleries ? [...galleries].slice(-4).reverse() : [];

  return (
    <>
      <Helmet>
        <title>Vision9 Modular Solar Racking | Field-Proven, Ontario-Built</title>
        <meta name="description" content="The Vision9 Modular Racking System — field-proven, seasonally adjustable solar racking designed, built, and supplied in Ontario. Net-metering and off-grid installs also available." />
      </Helmet>

      {/* Hero Section — Modular Racking */}
      <section className="bg-background py-20 md:py-28 lg:py-32 overflow-hidden relative">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="z-10">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="h-9 w-9 rounded-lg bg-background ring-1 ring-primary/25 shadow-sm flex items-center justify-center">
                <img src={modularRackingIcon} alt="" aria-hidden="true" className="h-6 w-6" />
              </span>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary">
                Introducing — The Vision9 Modular Racking System
              </p>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 leading-[1.05] tracking-tight">
              Modular Racking,<br />
              Developed in the Field.<br />
              <span className="text-primary">Built by Professionals.</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary mb-10 max-w-lg leading-relaxed">
              Ontario-engineered, field-proven solar racking — designed and supplied by a team that has spent a decade operating and maintaining solar in real conditions. One unit adjusts through every season.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="font-semibold rounded">
                <Link href="/modular-racking" data-testid="hero-cta-racking-quote">Get a Racking Quote</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-semibold rounded">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
          </Reveal>
          <Reveal className="relative z-10" delay={0.15}>
            <img src={modular45Img} alt="Vision9 Modular Racking unit tilted to a 45-degree angle in an Ontario field" className="w-full h-auto rounded-lg shadow-2xl object-cover aspect-[4/3]" loading="eager" />
          </Reveal>
        </div>
      </section>

      {/* Modular Racking Showcase — promoted to top */}
      <ModularRackingSection id="how-it-works" />

      {/* Manufacturer Credibility Band */}
      <section className="bg-muted border-y border-border">
        <div className="container mx-auto px-4 py-12 md:py-14">
          <StaggerChildren
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6"
            staggerDelay={0.08}
          >
            {CREDIBILITY.map(({ icon: Icon, label, sub }) => (
              <StaggerItem key={label} className="flex items-start gap-3 text-left">
                <div className="shrink-0 h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm md:text-base leading-tight">{label}</p>
                  <p className="text-xs md:text-sm text-secondary mt-1 leading-snug">{sub}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
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

      {/* Expertise Section */}
      <ExpertiseSection />

      {/* Also: Net Metering & Off-Grid (secondary) */}
      <section className="py-16 md:py-20 bg-muted border-t border-border">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-2xl mb-10">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary mb-3">Beyond Racking</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">Net Metering & Off-Grid Installs</h2>
            <p className="text-secondary text-base md:text-lg mt-3 leading-relaxed">
              The same field experience behind our racking powers full solar installs for homes, businesses, and remote builds across Ontario.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <Reveal className="order-2 md:order-1">
              <img src={builderImg} alt="Vision9 Solar commercial rooftop solar array installation in Northern Ontario" className="w-full h-56 md:h-72 rounded shadow-lg object-cover" loading="lazy" />
            </Reveal>
            <Reveal className="order-1 md:order-2 space-y-5" delay={0.1}>
              <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight">Hassle-Free Power Anywhere</h3>
              <p className="text-secondary leading-relaxed">
                No longer limited to local utilities — we enable cottages, homes, and getaways wherever your clients build.
              </p>
              <StaggerChildren as="ul" className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5" staggerDelay={0.05}>
                {[
                  "Opens new markets and opportunities",
                  "Meets sustainable, eco-friendly demands",
                  "Cost-effective, efficient remote power",
                  "Demonstrates ESG commitment",
                  "Industry-leading reliability"
                ].map((item, i) => (
                  <StaggerItem key={i} as="li" className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-foreground text-sm font-medium">{item}</span>
                  </StaggerItem>
                ))}
              </StaggerChildren>
              <div className="flex flex-wrap gap-4 pt-1">
                <Button asChild variant="link" className="px-0 text-primary hover:text-primary/80 font-semibold">
                  <Link href="/net-metering" className="flex items-center gap-2">
                    Net metering <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="link" className="px-0 text-primary hover:text-primary/80 font-semibold">
                  <Link href="/services" className="flex items-center gap-2">
                    All services <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Recent Projects Section */}
      {(galleriesLoading || recentGalleries.length > 0) && (
        <section className="py-24 md:py-28 bg-background">
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
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">Put field-proven racking on your next project.</h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Tell us about your site and we'll spec the right Vision9 Modular Racking system — or a full net-metering or off-grid install if that's what you need.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-sm px-8 transition-transform duration-200 hover:-translate-y-0.5">
                <Link href="/modular-racking">Get a Racking Quote</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-bold rounded-sm px-8 border-white/40 text-white hover:bg-white/10">
                <Link href="/estimates">Request a General Estimate</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
