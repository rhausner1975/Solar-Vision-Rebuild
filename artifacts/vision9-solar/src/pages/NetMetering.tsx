import { Helmet } from "react-helmet-async";
import { CheckCircle2 } from "lucide-react";
import img1 from "@/assets/source/Asset-4-1024x556.png";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/motion";

export default function NetMetering() {
  return (
    <>
      <Helmet>
        <title>Net Metering | Vision9 Solar Inc.</title>
        <meta name="description" content="Learn about residential and commercial net metering in Ontario. Offset your consumption and earn credits with solar power." />
      </Helmet>

      <section className="bg-primary/10 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-5 leading-[1.05] tracking-tight">Net Metering</h1>
            <p className="text-xl md:text-2xl text-secondary max-w-2xl mx-auto leading-relaxed">Residential & Commercial Solutions</p>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-28">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="order-2 md:order-1">
            <img src={img1} alt="Solar panel installation on a residential roof" className="w-full rounded shadow-lg" />
          </Reveal>
          <Reveal className="order-1 md:order-2 space-y-6" delay={0.1}>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">How Net Metering Works</h2>
            <p className="text-secondary text-lg leading-relaxed">
              Net metering is a billing mechanism that allows residential and commercial customers who generate their own electricity from solar panels or other renewable energy sources to offset their consumption and earn credits for excess power they generate.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              In Ontario, Canada, net metering has become an increasingly popular option for homeowners and businesses who want to reduce their carbon footprint and lower their energy bills.
            </p>
            <div className="pt-4">
              <h3 className="text-xl font-bold text-foreground mb-4">Key Benefits</h3>
              <StaggerChildren as="ul" className="space-y-3" staggerDelay={0.06}>
                {[
                  "Significantly lower your monthly hydro bills",
                  "Earn credits for excess energy produced",
                  "Protect yourself against rising electricity costs",
                  "Increase your property value",
                  "Reduce your carbon footprint"
                ].map((item, i) => (
                  <StaggerItem key={i} as="li" className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
