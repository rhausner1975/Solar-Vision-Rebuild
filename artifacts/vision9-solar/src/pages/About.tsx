import { Helmet } from "react-helmet-async";
import { CheckCircle2 } from "lucide-react";
import img from "@/assets/source/finished-residential-array.jpg";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/motion";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Us | Vision9 Solar Inc.</title>
        <meta name="description" content="Learn about our team's expertise in mechanical, electrical engineering, and automation for top-tier solar solutions." />
      </Helmet>

      <section className="bg-primary/10 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-5 leading-[1.05] tracking-tight">About Us</h1>
            <p className="text-xl md:text-2xl text-secondary max-w-2xl mx-auto leading-relaxed">Expertise you can count on. Solar engineers who have actually been in the field.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-28">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">Our Background</h2>
            <p className="text-secondary text-lg leading-relaxed">
              Our team is made up of people that have spent years in the field gaining hands-on experience, seeing firsthand issues and how to resolve them, and implementing solutions to improve reliability.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              We bring together technicians with diverse backgrounds in various industries to provide top-tier solutions.
            </p>

            <div className="pt-6">
              <h3 className="text-xl font-bold text-foreground mb-4">We come from:</h3>
              <StaggerChildren as="ul" className="space-y-3" staggerDelay={0.06}>
                {[
                  "Mechanical and Electrical Engineering",
                  "Automotive research and development",
                  "Medical equipment research and development",
                  "IT / Networking",
                  "Fabrication background for US military",
                  "Automation and Robotics"
                ].map((item, i) => (
                  <StaggerItem key={i} as="li" className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>

            <p className="text-secondary text-lg pt-4 font-medium italic leading-relaxed">
              And we all have a passion to design, provide, build, and support to offer the best possible products, services, and solutions.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <img src={img} alt="Completed Vision9 Solar residential installation by the engineering team" className="w-full h-[28rem] rounded shadow-lg object-cover" loading="lazy" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
