import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNotificationSettings,
  useUpdateNotificationSettings,
  useSendTestNotification,
  useSendTestNotificationSms,
  useGetNotificationLog,
  getGetNotificationSettingsQueryKey,
} from "@workspace/api-client-react";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  recipients: z
    .array(
      z.object({
        email: z.string().email("Enter a valid email address"),
      }),
    )
    .min(1, "Add at least one recipient")
    .max(20, "At most 20 recipients allowed"),
  smsRecipient: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\+[1-9]\d{1,14}$/.test(v),
      "Enter a phone number in E.164 format (e.g. +15551234567)",
    ),
});

type FormValues = z.infer<typeof formSchema>;

function formatDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function relatedLabel(kind: string | null | undefined, id: number | null | undefined): string {
  if (!kind) return "-";
  const label =
    kind === "contact" ? "Contact submission" : kind === "estimate" ? "Estimate request" : kind;
  return id ? `${label} #${id}` : label;
}

export default function NotificationSettings() {
  const { data, isLoading } = useGetNotificationSettings();
  const update = useUpdateNotificationSettings();
  const sendTest = useSendTestNotification();
  const sendTestSms = useSendTestNotificationSms();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [hydrated, setHydrated] = useState(false);
  const { data: logEntries, isLoading: isLoadingLog } = useGetNotificationLog();

  function handleSendTest() {
    sendTest.mutate(undefined, {
      onSuccess: (result) => {
        if (result.delivered) {
          toast({
            title: "Test email sent",
            description: `Sent to ${result.recipients.join(", ")}. Check the inbox to confirm delivery.`,
          });
        } else {
          toast({
            title: "Test email failed",
            description:
              result.error ?? "The server tried to send the test but it was rejected.",
            variant: "destructive",
          });
        }
      },
      onError: (error: unknown) => {
        const apiError = error as { status?: number; data?: { error?: string } };
        if (apiError?.status === 429) {
          toast({
            title: "Slow down",
            description:
              apiError.data?.error ??
              "Too many test emails sent. Please wait a minute before trying again.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Could not send test email",
          description: "The request failed before the email could be sent.",
          variant: "destructive",
        });
      },
    });
  }

  function handleSendTestSms() {
    sendTestSms.mutate(undefined, {
      onSuccess: (result) => {
        if (result.delivered) {
          toast({
            title: "Test SMS sent",
            description: `Sent to ${result.recipient ?? "the configured number"}. Check the phone to confirm delivery.`,
          });
        } else if (!result.configured) {
          toast({
            title: "SMS is not configured",
            description:
              result.error ??
              "Save a phone number above (or set NOTIFY_SMS_TO) and configure Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Test SMS failed",
            description:
              result.error ?? "The server tried to send the SMS but Twilio rejected it.",
            variant: "destructive",
          });
        }
      },
      onError: () => {
        toast({
          title: "Could not send test SMS",
          description: "The request failed before the SMS could be sent.",
          variant: "destructive",
        });
      },
    });
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { recipients: [{ email: "" }], smsRecipient: "" },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "recipients",
  });

  useEffect(() => {
    if (!hydrated && data) {
      const recipients = data.recipients?.length
        ? data.recipients.map((email) => ({ email }))
        : [{ email: "" }];
      form.reset({ recipients, smsRecipient: data.smsRecipient ?? "" });
      setHydrated(true);
    }
  }, [data, form, hydrated]);

  function onSubmit(values: FormValues) {
    const trimmedSms = values.smsRecipient.trim();
    update.mutate(
      {
        data: {
          recipients: values.recipients.map((r) => r.email),
          smsRecipient: trimmedSms === "" ? null : trimmedSms,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Notification recipients updated" });
          queryClient.invalidateQueries({ queryKey: getGetNotificationSettingsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update recipients", variant: "destructive" });
        },
      },
    );
  }

  return (
    <>
      <Helmet>
        <title>Notification Settings | Admin</title>
      </Helmet>

      <div className="p-6 md:p-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-secondary">
            Choose who receives an email when a new contact submission or estimate request comes in.
          </p>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-sm p-6 max-w-2xl">
          <h2 className="text-xl font-bold text-foreground mb-6 border-b pb-2">Recipients</h2>

          {isLoading ? (
            <div className="text-secondary">Loading...</div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`recipients.${index}.email`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel className={index === 0 ? "" : "sr-only"}>
                          Recipient email
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="name@example.com"
                              {...inputField}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                            aria-label="Remove recipient"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="smsRecipient"
                  render={({ field: inputField }) => (
                    <FormItem className="pt-4 border-t">
                      <FormLabel>SMS recipient phone number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+15551234567"
                          autoComplete="off"
                          {...inputField}
                        />
                      </FormControl>
                      <p className="text-xs text-secondary">
                        Phone number that receives a text message for new leads. Use E.164 format
                        (country code with +). Leave blank to disable SMS alerts.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ email: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add another recipient
                  </Button>
                  <Button type="submit" disabled={update.isPending}>
                    {update.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSendTest}
                    disabled={sendTest.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendTest.isPending ? "Sending..." : "Send test email"}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSendTestSms}
                      disabled={sendTestSms.isPending}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {sendTestSms.isPending ? "Sending..." : "Send test SMS"}
                    </Button>
                    {data?.smsRecipient ? (
                      <span
                        className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-xs text-secondary"
                        data-testid="sms-effective-recipient"
                      >
                        Will send to&nbsp;
                        <span className="font-mono text-foreground">{data.smsRecipient}</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-secondary"
                        data-testid="sms-effective-recipient"
                      >
                        SMS disabled
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-secondary pt-2">
                  If no recipients are configured, notifications fall back to the default address.
                  The test email uses the saved recipients on the server, so save your changes first
                  if you've just edited the list. The test SMS goes to the saved phone number above
                  (or NOTIFY_SMS_TO if nothing is saved). Twilio credentials must also be configured
                  on the server.
                </p>
              </form>
            </Form>
          )}
        </div>

        <div className="bg-background rounded-lg border border-border shadow-sm p-6">
          <div className="flex items-baseline justify-between mb-6 border-b pb-2">
            <h2 className="text-xl font-bold text-foreground">Recent notifications</h2>
            <span className="text-xs text-secondary">Last 50 send attempts</span>
          </div>

          {isLoadingLog ? (
            <div className="text-secondary">Loading...</div>
          ) : !logEntries || logEntries.length === 0 ? (
            <div className="text-secondary text-sm">
              No notification attempts have been recorded yet. New leads will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-secondary border-b border-border">
                    <th className="py-2 pr-3 font-semibold">When</th>
                    <th className="py-2 pr-3 font-semibold">Channel</th>
                    <th className="py-2 pr-3 font-semibold">Recipients</th>
                    <th className="py-2 pr-3 font-semibold">Lead</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logEntries.map((entry) => {
                    const failed = entry.status === "failed";
                    return (
                      <tr
                        key={entry.id}
                        className={
                          "border-b border-border align-top " +
                          (failed ? "bg-red-50 dark:bg-red-950/30" : "")
                        }
                      >
                        <td className="py-3 pr-3 whitespace-nowrap">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="py-3 pr-3 capitalize">{entry.channel}</td>
                        <td className="py-3 pr-3">
                          {entry.recipients && entry.recipients.length > 0
                            ? entry.recipients.join(", ")
                            : "-"}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          {relatedLabel(entry.relatedKind, entry.relatedId)}
                        </td>
                        <td className="py-3 pr-3">
                          {failed ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300 font-medium">
                                <XCircle className="h-4 w-4" />
                                Failed
                              </span>
                              {entry.errorMessage ? (
                                <span className="text-xs text-red-700 dark:text-red-300 break-words max-w-md">
                                  {entry.errorMessage}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                              <CheckCircle2 className="h-4 w-4" />
                              Delivered
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
