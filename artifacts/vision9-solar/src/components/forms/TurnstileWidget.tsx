import { Turnstile } from "@marsidev/react-turnstile";
import { AlertCircle } from "lucide-react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  if (!SITE_KEY) {
    return (
      <div className="flex items-start gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded p-3">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Spam protection is not configured. Please contact us by phone or email
          while we restore the form.
        </span>
      </div>
    );
  }
  return (
    <Turnstile
      siteKey={SITE_KEY}
      options={{ theme: "light" }}
      onSuccess={(token) => onToken(token)}
      onError={() => onToken(null)}
      onExpire={() => onToken(null)}
    />
  );
}

export const TURNSTILE_CONFIGURED = Boolean(SITE_KEY);
