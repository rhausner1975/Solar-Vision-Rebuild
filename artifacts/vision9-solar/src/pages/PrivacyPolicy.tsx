import { Helmet } from "react-helmet-async";
import { Reveal } from "@/components/motion";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Vision9 Solar Inc.</title>
        <meta name="description" content="Privacy Policy for Vision9 Solar Inc. private QuickBooks Online integration." />
        <link rel="canonical" href="https://solar.vision9.biz/privacy" />
      </Helmet>

      <section className="bg-primary/10 py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 leading-tight tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-secondary text-lg">Vision9 Solar Inc.</p>
            <p className="text-secondary text-sm mt-2">Effective date: July 23, 2026</p>
          </Reveal>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <article className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">1. Introduction</h2>
              <p className="text-secondary leading-relaxed mb-4">
                This Privacy Policy explains how Vision9 Solar Inc. (&ldquo;Vision9 Solar,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) accesses, uses, stores, and protects information in connection with our private business-operations integration with QuickBooks Online (the &ldquo;Application&rdquo;). The Application is an internal tool used solely by Vision9 Solar and its authorized personnel to manage Vision9 Solar&apos;s own business records.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">2. Scope</h2>
              <p className="text-secondary leading-relaxed mb-4">
                This policy applies to data accessed and processed through the Application. It does not govern any other Vision9 Solar website, product, or service. Because the Application is a private, internal tool, the &ldquo;users&rdquo; of the Application are Vision9 Solar&apos;s own authorized staff, and the data processed is Vision9 Solar&apos;s own business data.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">3. Information We Access</h2>
              <p className="text-secondary leading-relaxed mb-4">
                With authorization granted through Intuit&apos;s secure OAuth process, the Application may access the following categories of data from Vision9 Solar&apos;s QuickBooks Online company:
              </p>
              <ul className="list-disc list-inside text-secondary leading-relaxed mb-4 space-y-2">
                <li>Company profile and settings</li>
                <li>Customers and contacts</li>
                <li>Products, services, and items</li>
                <li>Invoices, estimates, sales receipts, and payment status</li>
                <li>Bills, expenses, and purchase orders</li>
                <li>Financial reports (e.g., profit and loss, balance sheet, aging reports)</li>
              </ul>
              <p className="text-secondary leading-relaxed mb-4">
                The Application accesses this data only as needed to perform Vision9 Solar&apos;s bookkeeping, invoicing, reconciliation, and operational tasks. Access is granted by Vision9 Solar and can be revoked at any time by disconnecting the Application from within QuickBooks Online.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">4. How We Use Information</h2>
              <p className="text-secondary leading-relaxed mb-4">
                We use the information accessed through the Application to:
              </p>
              <ul className="list-disc list-inside text-secondary leading-relaxed mb-4 space-y-2">
                <li>View, create, and maintain Vision9 Solar&apos;s accounting and operational records;</li>
                <li>Prepare invoices, estimates, and reports;</li>
                <li>Reconcile records between our operational systems and QuickBooks Online;</li>
                <li>Support AI-assisted review and preparation of the above, subject to human review before any change is committed.</li>
              </ul>
              <p className="text-secondary leading-relaxed mb-4">
                We do not use this data for advertising, and we do not sell or rent it.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">5. AI Processing</h2>
              <p className="text-secondary leading-relaxed mb-4">
                The Application uses artificial-intelligence assistance (Anthropic&apos;s Claude) to help prepare and review accounting and operational work. Data sent to this AI service is processed under the provider&apos;s commercial terms and is <strong>not used to train the provider&apos;s AI models</strong>. AI-generated output is reviewed by authorized Vision9 Solar personnel before any record is created or changed in QuickBooks Online.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">6. How We Store and Protect Information</h2>
              <ul className="list-disc list-inside text-secondary leading-relaxed mb-4 space-y-2">
                <li>Data is processed on infrastructure controlled by Vision9 Solar, including an on-premise server, rather than on third-party hosted application platforms.</li>
                <li>Access to the Application and its data is restricted to authorized Vision9 Solar personnel over a private, access-controlled network.</li>
                <li>Authentication credentials and access tokens are stored in protected configuration, kept separate from ordinary backups, and encrypted.</li>
                <li>We apply reasonable administrative, technical, and physical safeguards appropriate to the sensitivity of the data.</li>
              </ul>
              <p className="text-secondary leading-relaxed mb-4">
                No method of transmission or storage is completely secure, and we cannot guarantee absolute security.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">7. Data Sharing and Disclosure</h2>
              <p className="text-secondary leading-relaxed mb-4">
                We do not sell, rent, or trade information accessed through the Application. We may disclose information only:
              </p>
              <ul className="list-disc list-inside text-secondary leading-relaxed mb-4 space-y-2">
                <li>To service providers (such as our AI processing provider) strictly to operate the Application, under confidentiality obligations;</li>
                <li>When required by law, regulation, legal process, or governmental request;</li>
                <li>To protect the rights, property, or safety of Vision9 Solar, our customers, or others.</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">8. Data Retention</h2>
              <p className="text-secondary leading-relaxed mb-4">
                We retain data only as long as needed for the operational and record-keeping purposes described above, or as required by applicable law, after which it is deleted or de-identified.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">9. Your Rights</h2>
              <p className="text-secondary leading-relaxed mb-4">
                Because the Application processes Vision9 Solar&apos;s own business records, requests regarding that data are handled internally by Vision9 Solar. Individuals with privacy questions or requests relating to personal information we may hold can contact us at{" "}
                <a href="mailto:info@vision9.biz" className="text-primary hover:underline font-medium">info@vision9.biz</a>, and we will respond in accordance with applicable law, including Canada&apos;s Personal Information Protection and Electronic Documents Act (PIPEDA).
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">10. Intuit and QuickBooks Online</h2>
              <p className="text-secondary leading-relaxed mb-4">
                The Application connects to QuickBooks Online using Intuit&apos;s official APIs and authorization process. Intuit is not responsible for this Application or its data practices. Authorization can be revoked at any time by disconnecting the Application from within QuickBooks Online, after which the Application will no longer access the connected company&apos;s data.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">11. Changes to This Policy</h2>
              <p className="text-secondary leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. Material changes will be reflected by updating the effective date above.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">12. Contact</h2>
              <p className="text-secondary leading-relaxed mb-4">
                <strong>Vision9 Solar Inc.</strong><br />
                Marmora, Ontario, K0K 2M0, Canada<br />
                Email: <a href="mailto:info@vision9.biz" className="text-primary hover:underline font-medium">info@vision9.biz</a><br />
                Phone: 705 570 5034
              </p>
            </div>
          </Reveal>
        </article>
      </section>
    </>
  );
}
