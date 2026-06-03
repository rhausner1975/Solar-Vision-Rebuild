import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import { ArrowLeft, LogOut, LayoutDashboard, MessageSquare, FileText, Image as ImageIcon, Key, Bell } from "lucide-react";
import { useEffect } from "react";
import {
  useAdminMe,
  useAdminLogout,
  getAdminMeQueryKey,
  useListInAppNotifications,
  useMarkAllInAppNotificationsRead,
  getListInAppNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/contact", label: "Contact Submissions", icon: MessageSquare },
  { href: "/admin/estimates", label: "Estimate Requests", icon: FileText },
  { href: "/admin/galleries", label: "Galleries", icon: ImageIcon },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/account", label: "Account", icon: Key },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: me, isLoading, error } = useAdminMe({
    query: {
      queryKey: getAdminMeQueryKey(),
      retry: false,
    }
  });

  const logout = useAdminLogout();

  // Redirect if not logged in
  useEffect(() => {
    if (error) setLocation("/admin/login");
  }, [error, setLocation]);

  // Force password change if required
  useEffect(() => {
    if (me && me.mustChangePassword && location !== "/admin/account") {
      setLocation("/admin/account");
    }
  }, [me, location, setLocation]);

  if (error || isLoading || !me) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminMeQueryKey() });
        setLocation("/admin/login");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-muted/30">
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border shrink-0 flex flex-col">
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <h2 className="font-bold text-sidebar-foreground">Vision9 Admin</h2>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          <div className="text-sm text-sidebar-foreground truncate px-2">
            Logged in as <span className="font-bold">{me.username}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 text-xs" onClick={handleLogout} disabled={logout.isPending}>
              <LogOut className="h-3 w-3 mr-2" />
              Logout
            </Button>
            <Button variant="outline" size="icon" asChild title="Back to site" className="hidden md:flex">
              <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function NotificationsBell() {
  const queryClient = useQueryClient();
  const { data } = useListInAppNotifications({
    query: {
      queryKey: getListInAppNotificationsQueryKey(),
      refetchInterval: 30_000,
    },
  });
  const markAllRead = useMarkAllInAppNotificationsRead();
  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  const handleOpenChange = (open: boolean) => {
    if (open && unread > 0) {
      markAllRead.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInAppNotificationsQueryKey() });
        },
      });
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b font-medium text-sm">In-app notifications</div>
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y">
            {items.map((n) => (
              <li key={n.id} className={`p-3 ${n.readAt ? "" : "bg-muted/40"}`}>
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{n.body}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}