import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNotificationSettings,
  useUpdateNotificationSettings,
  useSendTestNotification,
  getGetNotificationSettingsQueryKey,
} from "@workspace/api-client-react";
import { Send } from "lucide-react";
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
});

type FormValues = z.infer<typeof formSchema>;

export default function NotificationSettings() {
  const { data, isLoading } = useGetNotificationSettings();
  const update = useUpdateNotificationSettings();
  const sendTest = useSendTestNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [hydrated, setHydrated] = useState(false);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { recipients: [{ email: "" }] },
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
      form.reset({ recipients });
      setHydrated(true);
    }
  }, [data, form, hydrated]);

  function onSubmit(values: FormValues) {
    update.mutate(
      { data: { recipients: values.recipients.map((r) => r.email) } },
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

      <div className="p-6 md:p-8 max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-secondary">
            Choose who receives an email when a new contact submission or estimate request comes in.
          </p>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-sm p-6">
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
                </div>

                <p className="text-xs text-secondary pt-2">
                  If no recipients are configured, notifications fall back to the default address.
                  The test email uses the saved recipients on the server, so save your changes first
                  if you've just edited the list.
                </p>
              </form>
            </Form>
          )}
        </div>
      </div>
    </>
  );
}
