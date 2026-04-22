import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { MessageSquare, FileText, Image as ImageIcon } from "lucide-react";
import { 
  useListContactSubmissions, 
  useListEstimateRequests, 
  useListGalleries 
} from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: contacts } = useListContactSubmissions();
  const { data: estimates } = useListEstimateRequests();
  const { data: galleries } = useListGalleries();

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Vision9 Solar Inc.</title>
      </Helmet>

      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-secondary">Overview of your website's activity.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/admin/contact">
            <a className="block p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow hover-elevate">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Contact Submissions</h3>
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {contacts?.length || 0}
              </div>
            </a>
          </Link>

          <Link href="/admin/estimates">
            <a className="block p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow hover-elevate">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Estimate Requests</h3>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {estimates?.length || 0}
              </div>
            </a>
          </Link>

          <Link href="/admin/galleries">
            <a className="block p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow hover-elevate">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Galleries</h3>
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {galleries?.length || 0}
              </div>
            </a>
          </Link>
        </div>
      </div>
    </>
  );
}