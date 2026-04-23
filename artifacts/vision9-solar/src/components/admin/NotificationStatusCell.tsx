import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  MinusCircle,
  Clock,
  RefreshCw,
  Mail,
  MessageSquare,
  AlertOctagon,
} from "lucide-react";
import { NOTIFICATION_MAX_ATTEMPTS } from "@workspace/api-zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

interface ChannelInfo {
  status: NotificationStatus;
  error?: string | null;
  sentAt?: string | Date | null;
  attempts?: number | null;
  nextRetryAt?: string | Date | null;
  label: string;
  Icon: typeof Mail;
}

type FailedKind = "willRetry" | "gaveUp";

function failedKind(channel: ChannelInfo): FailedKind {
  return channel.nextRetryAt ? "willRetry" : "gaveUp";
}

function statusVisual(channel: ChannelInfo): {
  variant: "default" | "secondary" | "destructive" | "outline";
  Icon: typeof CheckCircle2;
  className: string;
  label: string;
} {
  switch (channel.status) {
    case "sent":
      return {
        variant: "default",
        Icon: CheckCircle2,
        className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
        label: "sent",
      };
    case "failed":
      if (failedKind(channel) === "willRetry") {
        return {
          variant: "outline",
          Icon: RefreshCw,
          className:
            "bg-amber-50 text-amber-900 hover:bg-amber-50 border-amber-300",
          label: "will retry",
        };
      }
      return {
        variant: "destructive",
        Icon: AlertOctagon,
        className: "",
        label: "gave up",
      };
    case "skipped":
      return {
        variant: "outline",
        Icon: MinusCircle,
        className: "text-muted-foreground",
        label: "skipped",
      };
    case "pending":
    default:
      return {
        variant: "outline",
        Icon: Clock,
        className: "text-muted-foreground",
        label: "pending",
      };
  }
}

function ChannelBadge({ channel }: { channel: ChannelInfo }) {
  const meta = statusVisual(channel);
  const StatusIcon = meta.Icon;
  const attempts = channel.attempts ?? 0;
  const tooltipLines: string[] = [`${channel.label}: ${meta.label}`];
  if (channel.status === "failed") {
    tooltipLines.push(
      `Attempts: ${attempts} of ${NOTIFICATION_MAX_ATTEMPTS}`,
    );
    if (channel.nextRetryAt) {
      const next = new Date(channel.nextRetryAt);
      tooltipLines.push(
        `Next retry: ${format(next, "MMM d, yyyy h:mm a")} (${formatDistanceToNow(next, { addSuffix: true })})`,
      );
    } else {
      tooltipLines.push("No further retries scheduled.");
    }
  } else if (attempts > 0 && channel.status !== "skipped") {
    tooltipLines.push(`Attempts: ${attempts}`);
  }
  if (channel.sentAt) {
    tooltipLines.push(`At: ${format(new Date(channel.sentAt), "MMM d, yyyy h:mm a")}`);
  }
  if (channel.error) {
    tooltipLines.push(`Reason: ${channel.error}`);
  }

  const showAttempts =
    (channel.status === "failed" || (attempts > 1 && channel.status !== "skipped")) &&
    attempts > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={meta.variant} className={`gap-1 cursor-help ${meta.className}`}>
          <channel.Icon className="h-3 w-3" />
          <StatusIcon className="h-3 w-3" />
          <span className="text-xs capitalize">{meta.label}</span>
          {showAttempts && (
            <span className="text-xs font-mono opacity-80">
              {attempts}/{NOTIFICATION_MAX_ATTEMPTS}
            </span>
          )}
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

function ChannelRetryHint({ channel }: { channel: ChannelInfo }) {
  if (channel.status !== "failed" || !channel.nextRetryAt) return null;
  const next = new Date(channel.nextRetryAt);
  return (
    <div className="text-[11px] text-amber-800 leading-tight">
      <span className="font-medium">{channel.label}</span> retry{" "}
      {formatDistanceToNow(next, { addSuffix: true })}
    </div>
  );
}

interface NotificationStatusCellProps {
  emailStatus: NotificationStatus;
  emailError?: string | null;
  emailSentAt?: string | Date | null;
  emailAttempts?: number | null;
  emailNextRetryAt?: string | Date | null;
  smsStatus: NotificationStatus;
  smsError?: string | null;
  smsSentAt?: string | Date | null;
  smsAttempts?: number | null;
  smsNextRetryAt?: string | Date | null;
  onResend: () => void;
  isResending: boolean;
}

export function NotificationStatusCell({
  emailStatus,
  emailError,
  emailSentAt,
  emailAttempts,
  emailNextRetryAt,
  smsStatus,
  smsError,
  smsSentAt,
  smsAttempts,
  smsNextRetryAt,
  onResend,
  isResending,
}: NotificationStatusCellProps) {
  const emailChannel: ChannelInfo = {
    status: emailStatus,
    error: emailError,
    sentAt: emailSentAt,
    attempts: emailAttempts,
    nextRetryAt: emailNextRetryAt,
    label: "Email",
    Icon: Mail,
  };
  const smsChannel: ChannelInfo = {
    status: smsStatus,
    error: smsError,
    sentAt: smsSentAt,
    attempts: smsAttempts,
    nextRetryAt: smsNextRetryAt,
    label: "SMS",
    Icon: MessageSquare,
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <ChannelBadge channel={emailChannel} />
        <ChannelBadge channel={smsChannel} />
      </div>
      <ChannelRetryHint channel={emailChannel} />
      <ChannelRetryHint channel={smsChannel} />
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
