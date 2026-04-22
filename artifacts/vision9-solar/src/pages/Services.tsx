import { Helmet } from "react-helmet-async";
import { CheckCircle2, Server, Network, ShieldCheck, DatabaseBackup } from "lucide-react";
import img1 from "@/assets/source/Asset-10-q50vk4591dtgi2njtxbdx4vebhe3kac91ayvc8jg1s.png";

export default function Services() {
  return (
    <>
      <Helmet>
        <title>Our Services | Vision9 Solar Inc.</title>
        <meta name="description" content="Explore our solar services including net metering, off-grid, and site maintenance, as well as IT consulting and field services." />
      </Helmet>

      <section className="bg-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Our Services</h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto">Comprehensive solar installations and IT field services</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16">
          <div className="space-y-12">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8 border-b-2 border-primary inline-block pb-2">Solar Services</h2>
              <div className="space-y-8">
                {[
                  { title: "Net Metering", desc: "Offset consumption and earn credits for excess power generation." },
                  { title: "Off-Grid Solar", desc: "High-quality remote solutions with brand name hardware and extended warranties." },
                  { title: "Site Analysis & Inspection", desc: "Finding the perfect location for long-term benefits." },
                  { title: "Site Maintenance", desc: "Proactive monitoring to ensure optimal performance and longevity." },
                  { title: "Site Monitoring Solutions", desc: "Remote monitoring systems to check status and receive alerts." }
                ].map((svc, i) => (
                  <div key={i} className="flex gap-4">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{svc.title}</h3>
                      <p className="text-secondary">{svc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-12">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8 border-b-2 border-primary inline-block pb-2">IT Services</h2>
              <div className="space-y-8">
                {[
                  { icon: Server, title: "IT Consulting", desc: "Expert guidance on infrastructure and technology strategy." },
                  { icon: Network, title: "Field IT Services", desc: "On-site troubleshooting, installation, and support." },
                  { icon: ShieldCheck, title: "Network Management Security", desc: "Robust protection for your data and communications." },
                  { icon: DatabaseBackup, title: "Backup and Disaster Recovery", desc: "Reliable solutions to prevent data loss." }
                ].map((svc, i) => (
                  <div key={i} className="flex gap-4">
                    <svc.icon className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{svc.title}</h3>
                      <p className="text-secondary">{svc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8">
               <img src={img1} alt="Solar and IT services" className="w-full rounded shadow-lg" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}