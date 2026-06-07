import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Sun,
  Snowflake,
  HardHat,
  Users,
  Puzzle,
  Cable,
  Wrench,
  CheckCircle2,
  Quote,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OFFICES, SITE_CONTACT } from "@/lib/siteContact";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  TurnstileWidget,
  TURNSTILE_CONFIGURED,
} from "@/components/forms/TurnstileWidget";
import {
  Reveal,
  StaggerChildren,
  StaggerItem,
  Counter,
} from "@/components/motion";
import { submitContactSubmission } from "@/lib/publicForms";

import heroPhoto from "@/assets/source/racking-field-cottage-winter.webp";
import workshopTwin from "@/assets/source/racking-workshop-twin-frame.webp";
import workshopGarage from "@/assets/source/racking-workshop-garage-build.webp";
import fieldResidential from "@/assets/source/racking-field-residential-snow.webp";
import fieldLowAngle from "@/assets/source/racking-field-low-angle-snow.webp";

const TRUST_BADGES = [
  { icon: HardHat, label: "10 Years Field Experience", sub: "Commercial solar O&M background" },
  { icon: Users, label: "2-Person Installation", sub: "No crew required" },
  { icon: Sun, label: "Seasonal Angle Adjustment", sub: "Maximize output year-round" },
  { icon: Snowflake, label: "Snow-Load Engineered", sub: "Built for Canadian winters" },
];

const PROBLEMS = [
  {
    n: "01",
    title: "Fixed-angle mounts lose up to 30% winter output",
    body: "The sun sits low in winter. A fixed rack built for summer angles sacrifices meaningful production exactly when you need it most — heating season. Most installers know this and say nothing.",
  },
  {
    n: "02",
    title: "Systems that can't grow without starting over",
    body: "You buy 4 panels today and 8 more next year. But your existing rack wasn't designed to expand. Now you're dismantling and rebuilding — at full cost — what should have been a bolt-on expansion.",
  },
  {
    n: "03",
    title: "Installs that need a crew — and still go wrong",
    body: "Undersized hardware, missing provisions for future cable runs, panels installed at the wrong height for snow shedding. These are installation-day decisions that cause years of operational headaches.",
  },
];

const FEATURES = [
  {
    icon: Sun,
    title: "Seasonal Angle Adjustment",
    body: "Adjustable from 15° to 65° to track the sun's position through the seasons. More production in winter when heating loads are highest. Takes one person 1 minute per module — no special tools.",
  },
  {
    icon: Puzzle,
    title: "True Modular Design — Grow as You Go",
    body: "Start with 2 panels. Add 4 more next spring. The system is designed from day one to expand. No rebuilding, no removing existing components — just bolt-on growth.",
  },
  {
    icon: Users,
    title: "2-Person Installation",
    body: "Engineered so that two people — with no specialized training — can complete a full installation safely and correctly. Because requiring a 4-person crew for a residential job is a real problem.",
  },
  {
    icon: Snowflake,
    title: "Snow-Shedding Geometry",
    body: "Panel angles, rail spacing, and mounting height are designed to shed heavy snow loads naturally. No climbing on roofs mid-winter to clear accumulation. Engineered for Ontario's real winters.",
  },
  {
    icon: Cable,
    title: "Built-In Cable Management",
    body: "Provisions for conduit runs and cable trays are integrated into the design — not an afterthought. Because we've seen too many installs where cables were routed in ways that caused failures 18 months later.",
  },
  {
    icon: Wrench,
    title: "Commercial-Grade Materials",
    body: "Anodized aluminum and stainless hardware — the same specification standards used in commercial solar field construction. Not residential-grade components dressed up in commercial-grade marketing.",
  },
];

const STEPS = [
  { n: "1", title: "Site Assessment", body: "Orient and position the array for optimal year-round production — we guide you through this." },
  { n: "2", title: "Foundation & Posts", body: "Set ground posts or roof anchors. Most installs use standard fence-post depth — no concrete required." },
  { n: "3", title: "Rail Assembly", body: "Bolt rails to posts. The modular connection system aligns automatically — no measuring tape needed." },
  { n: "4", title: "Panel Mount & Wire", body: "Clamp panels into position. Route cables through built-in channels. Set your seasonal angle and connect." },
];

const CAPABILITIES = [
  "Solar O&M",
  "Commercial Field Construction",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Automation & Robotics",
  "Failure Mode Analysis",
];

const HERITAGE_STATS = [
  { value: 10, suffix: "+", label: "Years combined solar O&M field experience" },
  { value: 100, suffix: "s", label: "Commercial solar installations maintained & serviced" },
  { value: 2, suffix: "", label: "People needed for a full installation" },
  { value: 0, suffix: "", label: "Design decisions made without a field reason" },
];

const HOMEOWNER_BULLETS = [
  "Trouble-free ownership — fewer maintenance visits, fewer callbacks",
  "Start with what you need today; expand as your load grows",
  "Designed to shed snow — less maintenance in the season that matters most",
  "Seasonal adjustment means maximum output year-round, not just summer",
  "Complete system guidance — we help you size it right the first time",
];

const INSTALLER_BULLETS = [
  "Faster installs = lower labour cost, more jobs per season",
  "Fewer callbacks — it's designed to not have the common failure points",
  "Premium positioning = margin protection (stop competing on price)",
  "Complete system approach — racking, electrical, batteries as a package",
  "Become a certified Vision9 partner — territory and training support",
];

type GalleryTile =
  | { kind: "photo"; src: string; alt: string; title: string; caption: string }
  | { kind: "placeholder"; title: string; caption: string };

const GALLERY: GalleryTile[] = [
  {
    kind: "photo",
    src: heroPhoto,
    alt: "Vision9 modular racking system installed in a snowy clearing in Northern Ontario",
    title: "Northern Ontario — Field Install",
    caption: "Modular frame standing through full winter conditions",
  },
  {
    kind: "photo",
    src: fieldResidential,
    alt: "Vision9 racking with single ground-mount panel in deep residential snow",
    title: "Residential Ground Mount",
    caption: "Single-panel starter system, designed to expand",
  },
  {
    kind: "photo",
    src: fieldLowAngle,
    alt: "Vision9 racking demonstrating low seasonal angle in fresh snow",
    title: "Seasonal Angle — Set Low for Sun Capture",
    caption: "Same frame, low angle for high-sun months",
  },
  {
    kind: "photo",
    src: workshopTwin,
    alt: "Two-panel Vision9 modular racking frame being fabricated in the Vision9 shop",
    title: "Twin-Panel Frame in Fabrication",
    caption: "Anodized aluminum frame being built in our shop",
  },
  {
    kind: "photo",
    src: workshopGarage,
    alt: "Vision9 modular racking with two angled panels assembled in the build bay",
    title: "Pre-Delivery Build & QA",
    caption: "Every system is bench-checked before it ships",
  },
  {
    kind: "placeholder",
    title: "Cottage Expansion — Coming Soon",
    caption: "Expanded from 4 to 8 panels using modular growth rails",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I'd been burned by a cheap racking system before — panels weren't shedding snow properly and I ended up on my roof every storm. The Vision9 system is completely different. First winter was trouble-free. I barely thought about it.",
    name: "Customer Name",
    role: "Off-grid cottage owner, Haliburton ON",
  },
  {
    quote:
      "As an installer, the 2-person setup is the thing that sold me. We did the first job with just two guys on a Saturday. No rented equipment, no extra crew. The margin improvement on labour alone is significant.",
    name: "Installer Name",
    role: "Solar installer partner, Eastern Ontario",
  },
];

const AUDIENCE_OPTIONS = [
  { value: "homeowner", label: "Homeowner / Cottage owner" },
  { value: "installer", label: "Solar installer / Reseller" },
  { value: "builder", label: "Builder / Contractor" },
  { value: "other", label: "Other" },
] as const;

type AudienceValue = (typeof AUDIENCE_OPTIONS)[number]["value"];

function audienceLabel(value: string): string {
  const found = AUDIENCE_OPTIONS.find((o) => o.value === value)?.label;
  if (found) return found;
  return value || "Unspecified";
}

const leadSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(320),
  phone: z.string().max(50).optional(),
  audience: z.string().min(1, "Please tell us who you are"),
  location: z.string().min(1, "Location helps us size the system").max(200),
  message: z.string().max(5000).optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export default function ModularRacking() {
  const { toast } = useToast();
  const formSectionRef = useRef<HTMLDivElement>(null);
  const createLead = useMutation({ mutationFn: submitContactSubmission });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [widgetResetKey, setWidgetResetKey] = useState(0);
  const mountedAtRef = useRef<number>(Date.now());

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      audience: "",
      location: "",
      message: "",
    },
  });

  function scrollToForm(audience?: AudienceValue) {
    if (audience) {
      form.setValue("audience", audience, { shouldValidate: false });
    }
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForAnotherSubmission() {
    createLead.reset();
    setCaptchaToken(null);
    setHoneypot("");
    setWidgetResetKey((k) => k + 1);
    mountedAtRef.current = Date.now();
  }

  function onSubmit(data: LeadFormValues) {
    if (TURNSTILE_CONFIGURED && !captchaToken) {
      toast({
        title: "Verification needed",
        description: "Please complete the human verification before sending.",
        variant: "destructive",
      });
      return;
    }
    const audience = audienceLabel(data.audience);
    const message =
      `[Audience: ${audience}]\n` +
      `Location: ${data.location}\n\n` +
      (data.message?.trim() || "(no additional details provided)");
    const payload = {
      name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      phone: data.phone || undefined,
      subject: `Modular Racking inquiry — ${audience}`,
      message,
      turnstileToken: captchaToken,
      website: honeypot,
      formMountedAt: mountedAtRef.current,
    } as Parameters<typeof submitContactSubmission>[0];
    createLead.mutate(
      payload,
      {
        onSuccess: () => {
          toast({
            title: "Thanks — we're on it",
            description:
              "We received your project details and will respond within 1 business day.",
          });
          form.reset();
        },
        onError: (error: Error) => {
          toast({
            title: "Couldn't send",
            description:
              error?.message ||
              `There was a problem sending your details. Please try again or call us at ${SITE_CONTACT.primaryPhoneDisplay}.`,
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <>
      <Helmet>
        <title>Vision9 Modular Solar Racking — Built From the Field Up</title>
        <meta
          name="description"
          content="The Vision9 Modular Solar Racking System: seasonal angle adjustment, true modular expansion, 2-person installation, snow-load engineered. Built from 10 years of off-grid solar O&M field experience in Ontario."
        />
      </Helmet>

      {/* HERO */}
      <section className="relative bg-background overflow-hidden">
        <div className="container mx-auto px-4 pt-16 pb-20 md:pt-20 md:pb-28 lg:pt-24">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-6">
              <Sun className="h-4 w-4" />
              Now shipping across Canada &amp; the northern US
            </div>
          </Reveal>
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <Reveal>
                <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-4">
                  Modular Solar Racking — Built From the Field Up
                </p>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.02] tracking-tight mb-6">
                  Don't learn{" "}
                  <span className="text-primary italic">like we did.</span>
                </h1>
                <p className="text-lg md:text-xl text-secondary leading-relaxed max-w-xl mb-10">
                  The Vision9 Modular Racking System was engineered from 10 years
                  of off-grid solar O&amp;M experience. Every design decision —
                  every angle, every connection, every choice of hardware —
                  solves a real problem we've encountered in the field.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="font-semibold rounded"
                    onClick={() => scrollToForm()}
                    data-testid="hero-cta-quote"
                  >
                    Get Your Custom Quote
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="font-semibold rounded"
                  >
                    <a href="#how-it-works" data-testid="hero-cta-how">
                      See How It Works
                    </a>
                  </Button>
                </div>
                <p className="text-sm text-secondary mt-6 italic">
                  Trouble-free installation &amp; ownership — by design, not by luck.
                </p>
              </Reveal>
            </div>
            <Reveal className="lg:col-span-6 order-1 lg:order-2" delay={0.15}>
              <div className="relative">
                <img
                  src={heroPhoto}
                  alt="Vision9 Modular Racking System standing through Northern Ontario winter conditions"
                  className="w-full h-auto rounded-lg shadow-2xl object-cover aspect-[4/5] md:aspect-[4/3] lg:aspect-[4/5]"
                  loading="eager"
                />
                <div className="absolute -bottom-4 -left-4 hidden md:block bg-foreground text-background px-5 py-3 rounded shadow-xl">
                  <p className="text-xs uppercase tracking-wider text-gray-300 font-semibold">
                    Real install
                  </p>
                  <p className="text-sm font-bold">Northern Ontario · winter</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-muted border-y border-border">
        <div className="container mx-auto px-4 py-10 md:py-12">
          <StaggerChildren
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6"
            staggerDelay={0.08}
          >
            {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
              <StaggerItem
                key={label}
                className="flex items-start gap-3 text-left"
              >
                <div className="shrink-0 h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm md:text-base leading-tight">
                    {label}
                  </p>
                  <p className="text-xs md:text-sm text-secondary mt-1 leading-snug">
                    {sub}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* PROBLEMS */}
      <section className="py-24 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-3xl mb-16">
            <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
              Why Most Off-Grid Systems Disappoint
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              Off-grid solar fails for predictable reasons. We've seen all of them.
            </h2>
            <p className="text-lg text-secondary mt-6 leading-relaxed">
              After a decade maintaining commercial solar installations and
              building off-grid systems across Ontario, we've watched the same
              problems repeat themselves — not because of bad panels, but because
              of bad mounting decisions made during installation day.
            </p>
          </Reveal>
          <StaggerChildren
            className="grid md:grid-cols-3 gap-6 lg:gap-8"
            staggerDelay={0.1}
          >
            {PROBLEMS.map((p) => (
              <StaggerItem key={p.n}>
                <Card className="h-full hover-elevate transition-shadow duration-300 hover:shadow-lg border-border">
                  <CardContent className="p-8">
                    <p className="font-extrabold text-5xl text-primary/30 leading-none mb-4 tabular-nums">
                      {p.n}
                    </p>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground leading-snug mb-3">
                      {p.title}
                    </h3>
                    <p className="text-secondary leading-relaxed">{p.body}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 md:py-28 bg-muted">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-3xl mb-16">
            <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
              The Vision9 Modular Racking System
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              Every feature solves a real problem we've lived.
            </h2>
            <p className="text-lg text-secondary mt-6 leading-relaxed">
              This isn't a product designed in an office. It was designed by
              people who have spent years fixing other people's mistakes in the
              field — and who got tired of seeing the same preventable failures.
            </p>
          </Reveal>
          <StaggerChildren
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            staggerDelay={0.08}
          >
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <StaggerItem key={title}>
                <Card className="h-full hover-elevate transition-shadow duration-300 hover:shadow-lg border-border">
                  <CardContent className="p-7">
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center text-primary mb-5">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-foreground leading-tight mb-3">
                      {title}
                    </h3>
                    <p className="text-secondary leading-relaxed text-sm md:text-base">
                      {body}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* INSTALLATION OVERVIEW — sticky scroll */}
      <section id="how-it-works" className="py-24 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-3xl mb-16">
            <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
              Installation Overview
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              From delivery to first power in a weekend.
            </h2>
          </Reveal>

          {/* Mobile: image then sequential steps */}
          <div className="lg:hidden">
            <Reveal>
              <img
                src={workshopTwin}
                alt="Vision9 modular racking frame with twin panels assembled at adjustable angle"
                className="w-full rounded-lg shadow-lg object-cover aspect-[4/3] mb-10"
                loading="lazy"
              />
            </Reveal>
            <StaggerChildren className="space-y-8" staggerDelay={0.1}>
              {STEPS.map((step) => (
                <StaggerItem key={step.n}>
                  <div className="flex gap-5">
                    <div className="shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      {step.n}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2 leading-tight">
                        {step.title}
                      </h3>
                      <p className="text-secondary leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>

          {/* Desktop: sticky image + scrolling steps */}
          <div className="hidden lg:grid grid-cols-12 gap-12">
            <div className="col-span-5">
              <div className="sticky top-28">
                <img
                  src={workshopTwin}
                  alt="Vision9 modular racking frame with twin panels assembled at adjustable angle"
                  className="w-full rounded-lg shadow-2xl object-cover aspect-[4/5]"
                  loading="lazy"
                />
                <p className="text-sm text-secondary mt-4 italic text-center">
                  The same frame from delivery to ready-to-install.
                </p>
              </div>
            </div>
            <div className="col-span-7 space-y-24 py-8">
              {STEPS.map((step) => (
                <Reveal key={step.n}>
                  <div className="flex gap-6">
                    <div className="shrink-0 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-xl">
                      {step.n}
                    </div>
                    <div>
                      <h3 className="text-2xl xl:text-3xl font-bold text-foreground mb-3 leading-tight">
                        {step.title}
                      </h3>
                      <p className="text-secondary text-lg leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HERITAGE */}
      <section className="py-24 md:py-28 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-3xl mb-12">
            <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
              Who Built This &amp; Why
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              We're not a startup. We're the people who fix other people's systems.
            </h2>
            <p className="text-lg text-secondary mt-6 leading-relaxed">
              Vision9 started as a solar O&amp;M company — the team that gets
              called in when a system isn't performing, when panels are failing
              prematurely, when an install that looked fine on paper is costing
              the owner money every month. We've maintained commercial solar
              installations across Ontario for a decade.
            </p>
          </Reveal>

          <Reveal className="max-w-4xl mx-auto my-16">
            <div className="relative px-6 md:px-12 py-10 border-l-4 border-primary bg-muted rounded-r">
              <Quote className="absolute -top-4 -left-4 h-8 w-8 text-primary bg-background p-1 rounded" />
              <p className="text-2xl md:text-3xl font-bold text-foreground leading-snug italic">
                "We got tired of seeing the same preventable failures. So we
                built the system we wish existed."
              </p>
            </div>
          </Reveal>

          <Reveal className="max-w-4xl">
            <p className="text-lg text-secondary leading-relaxed mb-10">
              The Vision9 Modular Racking System is the result of that
              experience. Not a product built to a spec sheet — a product built
              to real field conditions, by people who will personally stand
              behind it.
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3 mb-16">
              {CAPABILITIES.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>

          <StaggerChildren
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 border-t border-border pt-12"
            staggerDelay={0.1}
          >
            {HERITAGE_STATS.map((stat, i) => (
              <StaggerItem key={i} className="text-center md:text-left">
                <div className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary mb-2 leading-none tabular-nums">
                  <Counter
                    to={stat.value}
                    suffix={stat.suffix}
                    duration={1.6}
                    data-testid={`heritage-stat-${i}`}
                  />
                </div>
                <p className="text-sm text-secondary font-medium leading-snug">
                  {stat.label}
                </p>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* TWO AUDIENCES */}
      <section className="py-24 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-3xl mb-16 text-center mx-auto">
            <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
              Who Vision9 Is Built For
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              Two audiences. One system. Different reasons to love it.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            <Reveal>
              <Card className="h-full border-border hover-elevate transition-shadow duration-300 hover:shadow-lg">
                <CardContent className="p-8 md:p-10 flex flex-col h-full">
                  <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary mb-3">
                    For Homeowners &amp; Cottage Owners
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-5">
                    You're buying 10 years of hard-won experience.
                  </h3>
                  <p className="text-secondary leading-relaxed mb-6">
                    Off-grid is intimidating. There's a real learning curve, and
                    the mistakes are expensive. When you buy a Vision9 Solar,
                    you're not experimenting; you're following a blueprint
                    that's already been tested in the field, in real winters, on
                    real properties.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {HOMEOWNER_BULLETS.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground text-sm md:text-base">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto font-semibold rounded"
                      onClick={() => scrollToForm("homeowner")}
                      data-testid="audience-cta-homeowner"
                    >
                      Talk to Us About Your Property
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card className="h-full border-border hover-elevate transition-shadow duration-300 hover:shadow-lg">
                <CardContent className="p-8 md:p-10 flex flex-col h-full">
                  <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary mb-3">
                    For Installers &amp; Resellers
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-5">
                    Stop fighting margin erosion.
                  </h3>
                  <p className="text-secondary leading-relaxed mb-6">
                    Racking has become a commodity. Razor-thin margins, generic
                    products, and callbacks from customers who bought the
                    cheapest option. Vision9 gives you a system you can
                    genuinely differentiate on — and stand behind.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {INSTALLER_BULLETS.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground text-sm md:text-base">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto font-semibold rounded"
                      onClick={() => scrollToForm("installer")}
                      data-testid="audience-cta-installer"
                    >
                      Become a Vision9 Partner
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* PROOF GALLERY */}
      <section className="py-24 md:py-28 bg-muted">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-3xl mb-12">
            <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
              Proof in the Field
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              Real installations. Real conditions.
            </h2>
            <p className="text-lg text-secondary mt-6 leading-relaxed">
              Every system here is an actual Vision9 installation — not a
              rendering, not a competitor's photo with our logo on it. These are
              real properties, real winters, real customers.
            </p>
          </Reveal>
          <StaggerChildren
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            staggerDelay={0.08}
          >
            {GALLERY.map((tile, i) => (
              <StaggerItem key={i}>
                <div className="bg-background border border-border rounded-lg overflow-hidden shadow-sm hover-elevate transition-shadow duration-300 hover:shadow-lg h-full flex flex-col">
                  {tile.kind === "photo" ? (
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={tile.src}
                        alt={tile.alt}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-muted flex flex-col items-center justify-center text-secondary border-b border-border">
                      <ImageIcon className="h-10 w-10 opacity-30 mb-2" />
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                        Photo coming soon
                      </p>
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-base font-bold text-foreground leading-tight mb-1">
                      {tile.title}
                    </h3>
                    <p className="text-sm text-secondary leading-snug">
                      {tile.caption}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <Reveal className="max-w-3xl mb-12">
            <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
              What Customers Say
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              In their words.
            </h2>
          </Reveal>
          <StaggerChildren
            className="grid md:grid-cols-2 gap-6 lg:gap-8"
            staggerDelay={0.1}
          >
            {TESTIMONIALS.map((t, i) => (
              <StaggerItem key={i}>
                <Card className="h-full border-border bg-muted">
                  <CardContent className="p-8 md:p-10 flex flex-col h-full">
                    <Quote className="h-8 w-8 text-primary mb-4 opacity-60" />
                    <p className="text-lg text-foreground leading-relaxed italic mb-6">
                      "{t.quote}"
                    </p>
                    <div className="mt-auto pt-6 border-t border-border/60">
                      <p className="font-bold text-foreground">{t.name}</p>
                      <p className="text-sm text-secondary">{t.role}</p>
                      <p className="text-xs text-primary font-semibold mt-2 uppercase tracking-wide">
                        ← Replace with real customer testimonial
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* LEAD FORM */}
      <section
        ref={formSectionRef}
        id="contact"
        className="py-24 md:py-28 bg-muted scroll-mt-24"
      >
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <Reveal className="lg:col-span-5 space-y-8">
              <div>
                <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-3">
                  Start Your Project
                </p>
                <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
                  Ready to stop{" "}
                  <span className="italic text-primary">experimenting</span> with
                  your energy?
                </h2>
                <p className="text-lg text-secondary mt-6 leading-relaxed">
                  Tell us about your property and your energy goals. We'll come
                  back to you with a system recommendation sized for your
                  situation — no upsell, no guesswork.
                </p>
                <p className="text-base text-secondary mt-4 leading-relaxed">
                  Not sure what you need? That's fine — most people who call us
                  don't know yet. We've guided hundreds of property owners
                  through this. It starts with a conversation.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold tracking-[0.18em] uppercase text-secondary">
                  Two Ontario Offices
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {OFFICES.map((office) => (
                    <div key={office.id} className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-foreground text-sm">{office.region}</p>
                        {office.street ? (
                          <p className="text-secondary text-sm">{office.street}</p>
                        ) : null}
                        <p className="text-secondary text-sm">
                          {office.locality}, {office.province} — {office.postalCode}
                        </p>
                        {office.phoneTel && office.phoneDisplay ? (
                          <a
                            href={`tel:${office.phoneTel}`}
                            className="inline-flex items-center gap-2 mt-1 text-secondary hover:text-primary transition-colors text-sm"
                          >
                            <Phone className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{office.phoneDisplay}</span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={`tel:${SITE_CONTACT.primaryPhoneTel}`}
                  className="flex items-center gap-3 text-foreground hover:text-primary transition-colors group"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">{SITE_CONTACT.primaryPhoneDisplay}</span>
                </a>
                <a
                  href={SITE_CONTACT.emailHref}
                  className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{SITE_CONTACT.emailDisplay}</span>
                </a>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-7" delay={0.1}>
              <Card className="bg-background text-foreground border-border shadow-xl">
                <CardContent className="p-6 md:p-10">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">
                    Get Your System Recommendation
                  </h3>
                  {createLead.isSuccess ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h4 className="text-xl font-bold text-foreground mb-2">
                        Thanks — we're on it.
                      </h4>
                      <p className="text-secondary mb-6 max-w-md mx-auto">
                        We don't share your information. We respond within 1
                        business day.
                      </p>
                      <Button
                        onClick={resetForAnotherSubmission}
                        variant="outline"
                        data-testid="lead-form-reset"
                      >
                        Send Another
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-5"
                      >
                        <div className="grid md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Jane"
                                    autoComplete="given-name"
                                    data-testid="lead-firstName"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Doe"
                                    autoComplete="family-name"
                                    data-testid="lead-lastName"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="jane@example.com"
                                    autoComplete="email"
                                    data-testid="lead-email"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="(613) 555-0123"
                                    autoComplete="tel"
                                    data-testid="lead-phone"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="audience"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>I am a... *</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="lead-audience">
                                      <SelectValue placeholder="Select one" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {AUDIENCE_OPTIONS.map((opt) => (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location (Province / State) *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g. Haliburton, ON"
                                    data-testid="lead-location"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tell us about your project</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Property type, current power source, panels you're considering, timing, anything else we should know..."
                                  className="min-h-[140px]"
                                  data-testid="lead-message"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <input
                          type="text"
                          name="website"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            left: "-9999px",
                            width: 1,
                            height: 1,
                            opacity: 0,
                          }}
                        />

                        <TurnstileWidget
                          onToken={setCaptchaToken}
                          resetKey={widgetResetKey}
                        />

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full md:w-auto font-bold rounded"
                          disabled={
                            createLead.isPending ||
                            !TURNSTILE_CONFIGURED ||
                            !captchaToken
                          }
                          data-testid="lead-submit"
                        >
                          {createLead.isPending
                            ? "Sending..."
                            : "Send My Project Details"}
                          {!createLead.isPending && (
                            <ArrowRight className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                        <p className="text-xs text-secondary mt-2">
                          We don't share your information. We respond within 1
                          business day.
                        </p>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
