import { Helmet } from "react-helmet-async";
import { Reveal } from "@/components/motion";

export default function Launch() {
  return (
    <>
      <Helmet>
        <title>Vision9 Solar — Business Operations Integration</title>
        <meta name="description" content="Vision9 Solar Inc. private business-operations integration with QuickBooks Online." />
        <link rel="canonical" href="https://solar.vision9.biz/launch" />
      </Helmet>

      <section className="bg-primary/10 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-5 leading-tight tracking-tight">
              Business Operations &amp; Accounting Integration
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <p className="text-secondary text-lg leading-relaxed mb-6">
              Vision9 Solar Inc. builds and maintains a private software integration that connects our internal operations and bookkeeping workflows with QuickBooks Online. The integration lets our team read and maintain our own accounting records — invoices, estimates, bills, expenses, customers, and financial reports — more accurately and efficiently, with AI-assisted support.
            </p>
            <p className="text-secondary text-lg leading-relaxed mb-6">
              This application is a <strong>private, internal tool operated by and for Vision9 Solar Inc.</strong> It is not a public product, is not offered for sale, and does not onboard outside users. It accesses only Vision9 Solar&apos;s own QuickBooks Online company data, and only with our authorization.
            </p>
            <p className="text-secondary text-lg leading-relaxed">
              Questions about this application or how it handles data? Contact us at{" "}
              <a href="mailto:info@vision9.biz" className="text-primary hover:underline font-medium">info@vision9.biz</a>.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
