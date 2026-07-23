import { Helmet } from "react-helmet-async";
import { Reveal } from "@/components/motion";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service &amp; End-User License Agreement — Vision9 Solar Inc.</title>
        <meta name="description" content="Terms of Service and EULA for Vision9 Solar Inc. private QuickBooks Online integration." />
        <link rel="canonical" href="https://solar.vision9.biz/terms" />
      </Helmet>

      <section className="bg-primary/10 py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 leading-tight tracking-tight">
              Terms of Service
            </h1>
            <p className="text-secondary text-lg">End-User License Agreement — Vision9 Solar Inc.</p>
            <p className="text-secondary text-sm mt-2">Effective date: July 23, 2026</p>
          </Reveal>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <article className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">1. Acceptance</h2>
              <p className="text-secondary leading-relaxed mb-4">
                These Terms of Service and End-User License Agreement (&ldquo;Terms&rdquo;) govern access to and use of the Vision9 Solar business-operations integration with QuickBooks Online (the &ldquo;Application&rdquo;). By accessing or using the Application, the user agrees to these Terms. The Application is operated by Vision9 Solar Inc. (&ldquo;Vision9 Solar&rdquo;).
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">2. The Application</h2>
              <p className="text-secondary leading-relaxed mb-4">
                The Application is a <strong>private, internal integration</strong> that connects Vision9 Solar&apos;s operational systems with Vision9 Solar&apos;s own QuickBooks Online company. It is not a public product and is not offered to, or licensed for use by, third parties or the general public.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">3. License and Authorized Use</h2>
              <p className="text-secondary leading-relaxed mb-4">
                Vision9 Solar grants its authorized personnel a limited, non-exclusive, non-transferable, revocable license to use the Application solely for Vision9 Solar&apos;s internal business purposes. Use by anyone other than Vision9 Solar&apos;s authorized personnel is not permitted.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">4. Restrictions</h2>
              <p className="text-secondary leading-relaxed mb-4">
                Users shall not: (a) use the Application other than for Vision9 Solar&apos;s internal business operations; (b) attempt to access data of any company other than Vision9 Solar&apos;s authorized QuickBooks Online company; (c) reverse engineer, resell, sublicense, or distribute the Application; or (d) use the Application in violation of any applicable law or of Intuit&apos;s terms.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">5. Intuit and QuickBooks Online</h2>
              <p className="text-secondary leading-relaxed mb-4">
                The Application uses Intuit&apos;s APIs and is subject to Intuit&apos;s applicable developer and end-user terms. Intuit is not a party to these Terms and is not responsible for the Application. All QuickBooks and Intuit trademarks are the property of Intuit Inc.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">6. Data and Privacy</h2>
              <p className="text-secondary leading-relaxed mb-4">
                Use of the Application is also governed by the Vision9 Solar Privacy Policy, which is incorporated into these Terms by reference.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">7. Intellectual Property</h2>
              <p className="text-secondary leading-relaxed mb-4">
                The Application and all associated software, content, and materials are owned by Vision9 Solar or its licensors and are protected by applicable intellectual property laws.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-secondary leading-relaxed mb-4">
                The Application is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, whether express or implied, including any implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">9. Limitation of Liability</h2>
              <p className="text-secondary leading-relaxed mb-4">
                To the maximum extent permitted by law, Vision9 Solar shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, revenue, or profits, arising out of or related to use of the Application.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">10. Termination</h2>
              <p className="text-secondary leading-relaxed mb-4">
                Vision9 Solar may suspend or terminate access to the Application at any time. Authorization to access QuickBooks Online data may be revoked at any time by disconnecting the Application from within QuickBooks Online.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">11. Governing Law</h2>
              <p className="text-secondary leading-relaxed mb-4">
                These Terms are governed by the laws of the Province of Ontario, Canada, and the federal laws of Canada applicable therein, without regard to conflict-of-laws principles.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">12. Changes</h2>
              <p className="text-secondary leading-relaxed mb-4">
                Vision9 Solar may update these Terms from time to time. Material changes will be reflected by updating the effective date above.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">13. Contact</h2>
              <p className="text-secondary leading-relaxed mb-4">
                <strong>Vision9 Solar Inc.</strong><br />
                Email: <a href="mailto:info@vision9.biz" className="text-primary hover:underline font-medium">info@vision9.biz</a>
              </p>
            </div>
          </Reveal>
        </article>
      </section>
    </>
  );
}
