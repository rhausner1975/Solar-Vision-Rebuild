import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useConfirmAdminPasswordReset } from "@workspace/api-client-react";
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
import logo from "@/assets/source/Asset-3.png";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function AdminPasswordResetConfirm() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const confirm = useConfirmAdminPasswordReset();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const token = params?.token ?? "";

  function onSubmit(data: FormValues) {
    setErrorMessage(null);
    confirm.mutate(
      { data: { token, newPassword: data.newPassword } },
      {
        onSuccess: () => {
          toast({
            title: "Password updated",
            description: "Sign in with your new password.",
          });
          setLocation("/admin/login");
        },
        onError: () => {
          setErrorMessage(
            "This reset link is invalid or has expired. Please request a new one.",
          );
        },
      },
    );
  }

  return (
    <>
      <Helmet>
        <title>Set New Admin Password | Vision9 Solar Inc.</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <div className="w-full max-w-md bg-background rounded-lg shadow-lg border border-border p-8">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="Vision9 Solar" className="h-12 object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
            Set New Password
          </h1>
          <p className="text-center text-sm text-secondary mb-6">
            Choose a new admin password. All existing admin sessions will be
            signed out.
          </p>

          {errorMessage && (
            <div
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="text-reset-error"
            >
              {errorMessage}{" "}
              <Link
                to="/admin/password-reset"
                className="underline hover:no-underline"
              >
                Request a new link
              </Link>
              .
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                        data-testid="input-new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full font-bold"
                disabled={confirm.isPending || !token}
                data-testid="button-confirm-reset"
              >
                {confirm.isPending ? "Updating..." : "Set new password"}
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
        </div>
      </div>
    </>
  );
}
