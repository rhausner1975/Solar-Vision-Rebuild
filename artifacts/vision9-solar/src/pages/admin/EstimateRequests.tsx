import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { 
  useListEstimateRequests, 
  useDeleteEstimateRequest,
  getListEstimateRequestsQueryKey
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
import { Badge } from "@/components/ui/badge";

export default function EstimateRequests() {
  const { data: requests, isLoading } = useListEstimateRequests();
  const deleteRequest = useDeleteEstimateRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteRequest.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEstimateRequestsQueryKey() });
          toast({ title: "Deleted successfully" });
        },
        onError: () => {
          toast({ title: "Failed to delete", variant: "destructive" });
        }
      }
    );
  };

  return (
    <>
      <Helmet>
        <title>Estimate Requests | Admin</title>
      </Helmet>

      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estimate Requests</h1>
          <p className="text-secondary">Quote inquiries from potential clients.</p>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : !requests?.length ? (
            <div className="p-8 text-center text-muted-foreground">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client Details</TableHead>
                    <TableHead>Project Details</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="whitespace-nowrap align-top">
                        {format(new Date(req.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">{req.name}</div>
                        <div className="text-sm">
                          <a href={`mailto:${req.email}`} className="text-primary hover:underline block">{req.email}</a>
                          {req.phone && <a href={`tel:${req.phone}`} className="text-secondary hover:text-foreground">{req.phone}</a>}
                        </div>
                        {req.address && <div className="text-xs text-secondary mt-1">{req.address}</div>}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {req.propertyType && <Badge variant="outline">{req.propertyType}</Badge>}
                          {req.projectType && <Badge variant="outline">{req.projectType}</Badge>}
                        </div>
                        <div className="text-xs text-secondary grid gap-1">
                          {req.monthlyBill && <div>Bill: {req.monthlyBill}</div>}
                          {req.timeline && <div>Timeline: {req.timeline}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs align-top">
                        <div className="text-sm text-secondary line-clamp-3">{req.notes || "-"}</div>
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
                              <AlertDialogTitle>Delete Request?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the estimate request from {req.name}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(req.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}