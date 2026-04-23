import { format } from "date-fns";
import { CheckCircle2, XCircle, MinusCircle, Clock, RefreshCw, Mail, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

interface ChannelInfo {
  status: NotificationStatus;
  error?: string | null;
  sentAt?: string | Date | null;
  label: string;
  Icon: typeof Mail;
}

function statusVariant(status: NotificationStatus): {
  variant: "default" | "secondary" | "destructive" | "outline";
  Icon: typeof CheckCircle2;
  className: string;
} {
  switch (status) {
    case "sent":
      return {
        variant: "default",
        Icon: CheckCircle2,
        className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
      };
    case "failed":
      return { variant: "destructive", Icon: XCircle, className: "" };
    case "skipped":
      return {
        variant: "outline",
        Icon: MinusCircle,
        className: "text-muted-foreground",
      };
    case "pending":
    default:
      return {
        variant: "outline",
        Icon: Clock,
        className: "text-muted-foreground",
      };
  }
}

function ChannelBadge({ channel }: { channel: ChannelInfo }) {
  const meta = statusVariant(channel.status);
  const StatusIcon = meta.Icon;
  const tooltipLines: string[] = [
    `${channel.label}: ${channel.status}`,
  ];
  if (channel.sentAt) {
    tooltipLines.push(`At: ${format(new Date(channel.sentAt), "MMM d, yyyy h:mm a")}`);
  }
  if (channel.error) {
    tooltipLines.push(`Reason: ${channel.error}`);
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={meta.variant} className={`gap-1 cursor-help ${meta.className}`}>
          <channel.Icon className="h-3 w-3" />
          <StatusIcon className="h-3 w-3" />
          <span className="text-xs capitalize">{channel.status}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tooltipLines.map((l) => (
          <div key={l} className="text-xs">{l}</div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

interface NotificationStatusCellProps {
  emailStatus: NotificationStatus;
  emailError?: string | null;
  emailSentAt?: string | Date | null;
  smsStatus: NotificationStatus;
  smsError?: string | null;
  smsSentAt?: string | Date | null;
  onResend: () => void;
  isResending: boolean;
}

export function NotificationStatusCell({
  emailStatus,
  emailError,
  emailSentAt,
  smsStatus,
  smsError,
  smsSentAt,
  onResend,
  isResending,
}: NotificationStatusCellProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <ChannelBadge
          channel={{
            status: emailStatus,
            error: emailError,
            sentAt: emailSentAt,
            label: "Email",
            Icon: Mail,
          }}
        />
        <ChannelBadge
          channel={{
            status: smsStatus,
            error: smsError,
            sentAt: smsSentAt,
            label: "SMS",
            Icon: MessageSquare,
          }}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs w-fit"
        onClick={onResend}
        disabled={isResending}
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${isResending ? "animate-spin" : ""}`} />
        {isResending ? "Sending…" : "Resend"}
      </Button>
    </div>
  );
}
