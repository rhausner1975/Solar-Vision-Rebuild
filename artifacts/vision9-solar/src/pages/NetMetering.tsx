import { Helmet } from "react-helmet-async";
import { CheckCircle2 } from "lucide-react";
import img1 from "@/assets/source/Asset-4-1024x556.png";

export default function NetMetering() {
  return (
    <>
      <Helmet>
        <title>Net Metering | Vision9 Solar Inc.</title>
        <meta name="description" content="Learn about residential and commercial net metering in Ontario. Offset your consumption and earn credits with solar power." />
      </Helmet>

      <section className="bg-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Net Metering</h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto">Residential & Commercial Solutions</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <img src={img1} alt="Solar panel installation on a residential roof" className="w-full rounded shadow-lg" />
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <h2 className="text-3xl font-bold text-foreground">How Net Metering Works</h2>
            <p className="text-secondary text-lg leading-relaxed">
              Net metering is a billing mechanism that allows residential and commercial customers who generate their own electricity from solar panels or other renewable energy sources to offset their consumption and earn credits for excess power they generate.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              In Ontario, Canada, net metering has become an increasingly popular option for homeowners and businesses who want to reduce their carbon footprint and lower their energy bills.
            </p>
            <div className="pt-4">
              <h3 className="text-xl font-bold text-foreground mb-4">Key Benefits</h3>
              <ul className="space-y-3">
                {[
                  "Significantly lower your monthly hydro bills",
                  "Earn credits for excess energy produced",
                  "Protect yourself against rising electricity costs",
                  "Increase your property value",
                  "Reduce your carbon footprint"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}