import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { MessageSquare, FileText, Image as ImageIcon, ShieldCheck } from "lucide-react";
import {
  useListContactSubmissions,
  useListEstimateRequests,
  useListGalleries,
  useGetSpamBlockStats,
} from "@workspace/api-client-react";

const SPAM_REASON_LABELS: Record<string, string> = {
  honeypot: "Honeypot",
  "too-fast": "Too fast",
  "missing-timestamp": "Missing timestamp",
  "captcha-failed": "Captcha failed",
};

export default function Dashboard() {
  const { data: contacts } = useListContactSubmissions();
  const { data: estimates } = useListEstimateRequests();
  const { data: galleries } = useListGalleries();
  const { data: spamStats } = useGetSpamBlockStats();

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
          <Link href="/admin/contact" className="block p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow hover-elevate">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Contact Submissions</h3>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-extrabold text-foreground">
              {contacts?.length || 0}
            </div>
          </Link>

          <Link href="/admin/estimates" className="block p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow hover-elevate">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Estimate Requests</h3>
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-extrabold text-foreground">
              {estimates?.length || 0}
            </div>
          </Link>

          <Link href="/admin/galleries" className="block p-6 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow hover-elevate">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Galleries</h3>
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-extrabold text-foreground">
              {galleries?.length || 0}
            </div>
          </Link>
        </div>

        <div
          className="block p-6 bg-background rounded-lg border border-border shadow-sm"
          data-testid="spam-block-stats"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Spam attempts blocked</h3>
              <p className="text-sm text-secondary">
                Submissions our anti-spam stopped before they reached you.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <div className="text-sm text-secondary">Today</div>
              <div className="text-3xl font-extrabold text-foreground" data-testid="spam-today">
                {spamStats?.today ?? 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-secondary">Last 7 days</div>
              <div className="text-3xl font-extrabold text-foreground" data-testid="spam-week">
                {spamStats?.week ?? 0}
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground mb-2">
              By reason (last 7 days)
            </div>
            {spamStats && Object.keys(spamStats.byReasonWeek).length > 0 ? (
              <ul className="text-sm text-foreground space-y-1">
                {Object.entries(spamStats.byReasonWeek)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <li key={reason} className="flex justify-between">
                      <span>{SPAM_REASON_LABELS[reason] ?? reason}</span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary">No spam blocked in the last 7 days.</p>
            )}
          </div>
          {spamStats?.retentionDays ? (
            <p className="mt-4 text-xs text-secondary">
              History kept for {spamStats.retentionDays} days.
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}