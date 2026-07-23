import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { PageTransition, SmoothScroll } from "@/components/motion";
import { OFFICES, SITE_CONTACT, SITE_ORIGIN } from "@/lib/siteContact";

// Layouts
import { Shell } from "@/components/layout/Shell";
import { AdminShell } from "@/components/layout/AdminShell";

// Public Pages
import Home from "@/pages/Home";
import NetMetering from "@/pages/NetMetering";
import About from "@/pages/About";
import Services from "@/pages/Services";
import Estimates from "@/pages/Estimates";
import Contact from "@/pages/Contact";
import Galleries from "@/pages/Galleries";
import GalleryView from "@/pages/GalleryView";
import ModularRacking from "@/pages/ModularRacking";
import Launch from "@/pages/Launch";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Connect from "@/pages/Connect";
import Disconnect from "@/pages/Disconnect";

// Admin Pages
import AdminLogin from "@/pages/admin/Login";
import AdminPasswordResetRequest from "@/pages/admin/PasswordResetRequest";
import AdminPasswordResetConfirm from "@/pages/admin/PasswordResetConfirm";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminContact from "@/pages/admin/ContactSubmissions";
import AdminEstimates from "@/pages/admin/EstimateRequests";
import AdminGalleries from "@/pages/admin/Galleries";
import AdminGalleryEdit from "@/pages/admin/GalleryEdit";
import AdminAccount from "@/pages/admin/Account";
import AdminNotifications from "@/pages/admin/NotificationSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");
  const isUnauthenticatedAdmin =
    location === "/admin/login" ||
    location === "/admin/password-reset" ||
    location.startsWith("/admin/password-reset/");

  if (isAdmin) {
    if (isUnauthenticatedAdmin) {
      return (
        <Switch>
          <Route path="/admin/login" component={AdminLogin} />
          <Route
            path="/admin/password-reset"
            component={AdminPasswordResetRequest}
          />
          <Route
            path="/admin/password-reset/:token"
            component={AdminPasswordResetConfirm}
          />
        </Switch>
      );
    }
    return (
      <AdminShell>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/contact" component={AdminContact} />
          <Route path="/admin/estimates" component={AdminEstimates} />
          <Route path="/admin/galleries" component={AdminGalleries} />
          <Route path="/admin/galleries/:id" component={AdminGalleryEdit} />
          <Route path="/admin/account" component={AdminAccount} />
          <Route path="/admin/notifications" component={AdminNotifications} />
          <Route component={NotFound} />
        </Switch>
      </AdminShell>
    );
  }

  return (
    <Shell>
      <Helmet>
        <link rel="canonical" href={`${SITE_ORIGIN}${location === "/" ? "/" : location.replace(/\/$/, "")}`} />
      </Helmet>
      <SmoothScroll />
      <PageTransition routeKey={location}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/net-metering" component={NetMetering} />
          <Route path="/about" component={About} />
          <Route path="/services" component={Services} />
          <Route path="/modular-racking" component={ModularRacking} />
          <Route path="/estimates" component={Estimates} />
          <Route path="/contact" component={Contact} />
          <Route path="/galleries" component={Galleries} />
          <Route path="/galleries/:slug" component={GalleryView} />
          <Route path="/launch" component={Launch} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/connect" component={Connect} />
          <Route path="/disconnect" component={Disconnect} />
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    </Shell>
  );
}

// ssrPath and helmetContext are only passed by the build-time pre-renderer
// (src/entry-server.tsx); in the browser App is rendered without props.
function App({ ssrPath, helmetContext }: { ssrPath?: string; helmetContext?: object } = {}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "name": "Vision9 Solar Inc.",
    "areaServed": "Ontario, Canada",
    "telephone": SITE_CONTACT.primaryPhoneStructured,
    "email": SITE_CONTACT.emailDisplay,
    "url": SITE_ORIGIN,
    "logo": `${SITE_ORIGIN}/logo.png`,
    "address": OFFICES.map((office) => ({
      "@type": "PostalAddress",
      ...(office.street ? { "streetAddress": office.street } : {}),
      "addressLocality": office.locality,
      "addressRegion": office.province,
      "postalCode": office.postalCode,
      "addressCountry": office.country,
    })),
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": SITE_CONTACT.primaryPhoneStructured,
        "contactType": "sales",
        "areaServed": "CA",
        "availableLanguage": ["English"],
      },
      ...OFFICES.filter((o) => o.phoneTel).map((office) => ({
        "@type": "ContactPoint",
        "telephone": `+1-${office.phoneTel!.slice(0, 3)}-${office.phoneTel!.slice(3, 6)}-${office.phoneTel!.slice(6)}`,
        "contactType": "customer service",
        "areaServed": "CA",
        "availableLanguage": ["English"],
        "name": `${office.region} Office`,
      })),
    ],
  };

  return (
    <HelmetProvider context={helmetContext}>
      <Helmet>
        <title>Vision9 Solar Inc.</title>
        <meta name="description" content="Ontario solar installation company serving Marmora and Northern Ontario. Specializing in net-metering systems, off-grid solar power, and commercial O&M." />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")} ssrPath={ssrPath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;