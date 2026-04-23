import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import {
  useListContactSubmissions,
  useDeleteContactSubmission,
  useResendContactSubmissionNotification,
  getListContactSubmissionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  NotificationStatusCell,
  type NotificationStatus,
} from "@/components/admin/NotificationStatusCell";

export default function ContactSubmissions() {
  const { data: submissions, isLoading } = useListContactSubmissions();
  const deleteSubmission = useDeleteContactSubmission();
  const resendNotification = useResendContactSubmissionNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteSubmission.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContactSubmissionsQueryKey() });
          toast({ title: "Deleted successfully" });
        },
        onError: () => {
          toast({ title: "Failed to delete", variant: "destructive" });
        },
      },
    );
  };

  const handleResend = (id: number) => {
    resendNotification.mutate(
      { id, data: {} },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({ queryKey: getListContactSubmissionsQueryKey() });
          const emailOk = updated?.emailStatus === "sent";
          const smsOk = updated?.smsStatus === "sent";
          if (emailOk || smsOk) {
            toast({
              title: "Notification resent",
              description: `Email: ${updated?.emailStatus ?? "?"} · SMS: ${updated?.smsStatus ?? "?"}`,
            });
          } else {
            toast({
              title: "Resend completed with issues",
              description: `Email: ${updated?.emailStatus ?? "?"} · SMS: ${updated?.smsStatus ?? "?"}`,
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({ title: "Failed to resend notification", variant: "destructive" });
        },
      },
    );
  };

  return (
    <>
      <Helmet>
        <title>Contact Submissions | Admin</title>
      </Helmet>

      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contact Submissions</h1>
          <p className="text-secondary">Messages received from the contact form.</p>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : !submissions?.length ? (
            <div className="p-8 text-center text-muted-foreground">No submissions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Subject / Message</TableHead>
                    <TableHead>Notification</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => {
                    const isResending =
                      resendNotification.isPending &&
                      resendNotification.variables?.id === sub.id;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="whitespace-nowrap align-top">
                          {format(new Date(sub.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium align-top">{sub.name}</TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm">
                            <a href={`mailto:${sub.email}`} className="text-primary hover:underline block">{sub.email}</a>
                            {sub.phone && <a href={`tel:${sub.phone}`} className="text-secondary hover:text-foreground">{sub.phone}</a>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md align-top">
                          {sub.subject && <div className="font-semibold text-sm mb-1">{sub.subject}</div>}
                          <div className="text-sm text-secondary truncate">{sub.message}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <NotificationStatusCell
                            emailStatus={sub.emailStatus as NotificationStatus}
                            emailError={sub.emailError}
                            emailSentAt={sub.emailSentAt}
                            emailAttempts={sub.emailAttempts}
                            emailNextRetryAt={sub.emailNextRetryAt}
                            smsStatus={sub.smsStatus as NotificationStatus}
                            smsError={sub.smsError}
                            smsSentAt={sub.smsSentAt}
                            smsAttempts={sub.smsAttempts}
                            smsNextRetryAt={sub.smsNextRetryAt}
                            isResending={isResending}
                            onResend={() => handleResend(sub.id)}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the message from {sub.name}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(sub.id)} className="bg-destructive text-destructive-foreground">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
