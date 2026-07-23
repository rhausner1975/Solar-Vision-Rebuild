import { Helmet } from "react-helmet-async";
import { Reveal } from "@/components/motion";

export default function Connect() {
  return (
    <>
      <Helmet>
        <title>Connect to QuickBooks — Vision9 Solar Inc.</title>
        <meta name="description" content="Vision9 Solar Inc. private QuickBooks Online integration connection page." />
        <link rel="canonical" href="https://solar.vision9.biz/connect" />
      </Helmet>

      <section className="bg-primary/10 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-5 leading-tight tracking-tight">
              Connect the Vision9 Solar Integration to QuickBooks Online
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <p className="text-secondary text-lg leading-relaxed mb-6">
              This page is part of Vision9 Solar&apos;s private internal integration with QuickBooks Online. Connecting or reconnecting is performed by authorized Vision9 Solar personnel using Intuit&apos;s secure authorization process. Only Vision9 Solar&apos;s own QuickBooks Online company is accessed, and only with authorization.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              If you reached this page unexpectedly, no action is required. For questions, contact{" "}
              <a href="mailto:info@vision9.biz" className="text-primary hover:underline font-medium">info@vision9.biz</a>.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
