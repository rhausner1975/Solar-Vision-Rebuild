import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

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
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/net-metering" component={NetMetering} />
        <Route path="/about" component={About} />
        <Route path="/services" component={Services} />
        <Route path="/estimates" component={Estimates} />
        <Route path="/contact" component={Contact} />
        <Route path="/galleries" component={Galleries} />
        <Route path="/galleries/:slug" component={GalleryView} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "name": "Vision9 Solar Inc.",
    "areaServed": "Ontario, Canada",
    "telephone": "+1-613-813-4305",
    "email": "info@vision9.biz",
    "url": "https://vision9solar.com",
    "logo": "https://vision9solar.com/src/assets/source/Asset-3.png",
    "address": [
      {
        "@type": "PostalAddress",
        "addressLocality": "Marmora",
        "addressRegion": "ON",
        "postalCode": "K0K 2M0",
        "addressCountry": "CA"
      },
      {
        "@type": "PostalAddress",
        "addressLocality": "Kirkland Lake",
        "addressRegion": "ON",
        "postalCode": "P2N 3C8",
        "addressCountry": "CA"
      }
    ]
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Vision9 Solar Inc.</title>
        <meta name="description" content="Ontario solar installation company serving Marmora and Northern Ontario. Specializing in net-metering systems, off-grid solar power, and commercial O&M." />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;