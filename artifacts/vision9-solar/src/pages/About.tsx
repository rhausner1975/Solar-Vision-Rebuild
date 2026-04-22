import { Helmet } from "react-helmet-async";
import { Wrench, Zap, CheckCircle2 } from "lucide-react";
import img from "@/assets/source/Asset-6-q50tidp0x8vpr9rae1wybqporctjr1m9kcno2tv85c.png";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Us | Vision9 Solar Inc.</title>
        <meta name="description" content="Learn about our team's expertise in mechanical, electrical engineering, and automation for top-tier solar solutions." />
      </Helmet>

      <section className="bg-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">About Us</h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto">Expertise you can count on. Solar engineers who have actually been in the field.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Our Background</h2>
            <p className="text-secondary text-lg">
              Our team is made up of people that have spent years in the field gaining hands-on experience, seeing firsthand issues and how to resolve them, and implementing solutions to improve reliability.
            </p>
            <p className="text-secondary text-lg">
              We bring together technicians with diverse backgrounds in various industries to provide top-tier solutions.
            </p>
            
            <div className="pt-6">
              <h3 className="text-xl font-bold text-foreground mb-4">We come from:</h3>
              <ul className="space-y-3">
                {[
                  "Mechanical and Electrical Engineering",
                  "Automotive research and development",
                  "Medical equipment research and development",
                  "IT / Networking",
                  "Fabrication background for US military",
                  "Automation and Robotics"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-secondary text-lg pt-4 font-medium italic">
              And we all have a passion to design, provide, build, and support to offer the best possible products, services, and solutions.
            </p>
          </div>
          <div>
            <img src={img} alt="Engineering and automation expertise" className="w-full rounded shadow-lg" />
          </div>
        </div>
      </section>
    </>
  );
}