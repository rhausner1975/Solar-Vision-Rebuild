import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRequestAdminPasswordReset } from "@workspace/api-client-react";
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
import logo from "@/assets/source/Asset-3.png";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
});

type FormValues = z.infer<typeof schema>;

export default function AdminPasswordResetRequest() {
  const requestReset = useRequestAdminPasswordReset();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "" },
  });

  function onSubmit(data: FormValues) {
    requestReset.mutate(
      { data: { username: data.username } },
      {
        onSuccess: () => setSubmitted(true),
        onError: () => setSubmitted(true),
      },
    );
  }

  return (
    <>
      <Helmet>
        <title>Reset Admin Password | Vision9 Solar Inc.</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <div className="w-full max-w-md bg-background rounded-lg shadow-lg border border-border p-8">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="Vision9 Solar" className="h-12 object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
            Reset Admin Password
          </h1>
          <p className="text-center text-sm text-secondary mb-6">
            Enter your admin username. A one-time reset link will be emailed to
            the registered admin address.
          </p>

          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-foreground">
                If that account exists, a password reset link has been sent to
                the registered admin email. The link will expire in 15 minutes.
              </div>
              <Link
                to="/admin/login"
                className="block text-center text-sm text-primary underline hover:no-underline"
                data-testid="link-back-to-login"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-reset-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full font-bold"
                  disabled={requestReset.isPending}
                  data-testid="button-send-reset-link"
                >
                  {requestReset.isPending ? "Sending..." : "Send reset link"}
                </Button>

                <Link
                  to="/admin/login"
                  className="block text-center text-sm text-primary underline hover:no-underline"
                  data-testid="link-back-to-login"
                >
                  Back to login
                </Link>
              </form>
            </Form>
          )}
        </div>
      </div>
    </>
  );
}
