import { Helmet } from "react-helmet-async";
import { CheckCircle2, Server, Network, ShieldCheck, DatabaseBackup } from "lucide-react";
import img1 from "@/assets/source/inverter-wiring.jpg";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/motion";

export default function Services() {
  return (
    <>
      <Helmet>
        <title>Our Services | Vision9 Solar Inc.</title>
        <meta name="description" content="Explore our solar services including net metering, off-grid, and site maintenance, as well as IT consulting and field services." />
      </Helmet>

      <section className="bg-primary/10 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-5 leading-[1.05] tracking-tight">Our Services</h1>
            <p className="text-xl md:text-2xl text-secondary max-w-2xl mx-auto leading-relaxed">Comprehensive solar installations and IT field services</p>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-28">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16">
          <div className="space-y-12">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 border-b-2 border-primary inline-block pb-2 leading-tight">Solar Services</h2>
              <StaggerChildren className="space-y-8" staggerDelay={0.08}>
                {[
                  { title: "Net Metering", desc: "Offset consumption and earn credits for excess power generation." },
                  { title: "Off-Grid Solar", desc: "High-quality remote solutions with brand name hardware and extended warranties." },
                  { title: "Site Analysis & Inspection", desc: "Finding the perfect location for long-term benefits." },
                  { title: "Site Maintenance", desc: "Proactive monitoring to ensure optimal performance and longevity." },
                  { title: "Site Monitoring Solutions", desc: "Remote monitoring systems to check status and receive alerts." }
                ].map((svc, i) => (
                  <StaggerItem key={i} className="flex gap-4">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{svc.title}</h3>
                      <p className="text-secondary leading-relaxed">{svc.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </Reveal>
          </div>

          <div className="space-y-12">
            <Reveal delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 border-b-2 border-primary inline-block pb-2 leading-tight">IT Services</h2>
              <StaggerChildren className="space-y-8" staggerDelay={0.08}>
                {[
                  { icon: Server, title: "IT Consulting", desc: "Expert guidance on infrastructure and technology strategy." },
                  { icon: Network, title: "Field IT Services", desc: "On-site troubleshooting, installation, and support." },
                  { icon: ShieldCheck, title: "Network Management Security", desc: "Robust protection for your data and communications." },
                  { icon: DatabaseBackup, title: "Backup and Disaster Recovery", desc: "Reliable solutions to prevent data loss." }
                ].map((svc, i) => (
                  <StaggerItem key={i} className="flex gap-4">
                    <svc.icon className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{svc.title}</h3>
                      <p className="text-secondary leading-relaxed">{svc.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </Reveal>

            <Reveal className="mt-8" delay={0.15}>
               <img src={img1} alt="Dual SMA inverters wired and commissioned by Vision9 Solar technicians" className="w-full h-72 rounded shadow-lg object-cover" loading="lazy" />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
