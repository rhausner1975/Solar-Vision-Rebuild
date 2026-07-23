import { Helmet } from "react-helmet-async";
import { Reveal } from "@/components/motion";
import { Link } from "wouter";

export default function Disconnect() {
  return (
    <>
      <Helmet>
        <title>Disconnect — Vision9 Solar Inc.</title>
        <meta name="description" content="Disconnect the Vision9 Solar Inc. private QuickBooks Online integration." />
        <link rel="canonical" href="https://solar.vision9.biz/disconnect" />
      </Helmet>

      <section className="bg-primary/10 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-5 leading-tight tracking-tight">
              Disconnecting the Vision9 Solar Integration
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <p className="text-secondary text-lg leading-relaxed mb-6">
              The Vision9 Solar integration can be disconnected at any time from within QuickBooks Online (Settings → Apps → Disconnect), or by an authorized Vision9 Solar administrator. Once disconnected, the integration no longer accesses the connected QuickBooks Online company&apos;s data.
            </p>
            <p className="text-secondary text-lg leading-relaxed mb-6">
              If you have questions about disconnection or data handling, contact{" "}
              <a href="mailto:info@vision9.biz" className="text-primary hover:underline font-medium">info@vision9.biz</a>. See our{" "}
              <Link href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>{" "}
              for how data is retained and deleted.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
