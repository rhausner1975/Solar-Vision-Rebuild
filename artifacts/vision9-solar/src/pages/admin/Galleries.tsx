import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Plus, Edit2, Trash2, RefreshCw, Loader2 } from "lucide-react";
import {
  useListGalleries,
  useCreateGallery,
  useDeleteGallery,
  useBackfillImageVariants,
  getListGalleriesQueryKey,
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

export default function GalleriesAdmin() {
  const { data: galleries, isLoading } = useListGalleries();
  const createGallery = useCreateGallery();
  const deleteGallery = useDeleteGallery();
  const backfillVariants = useBackfillImageVariants();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);

  const runBackfill = (force: boolean) => {
    backfillVariants.mutate(
      { params: force ? { force: "1" } : undefined },
      {
        onSuccess: (result) => {
          toast({
            title: force ? "Force regenerate complete" : "Backfill complete",
            description: `Total: ${result.total} · Processed: ${result.processed} · Variants generated: ${result.generated} · Failed: ${result.failed}`,
          });
        },
        onError: () => {
          toast({
            title: "Backfill failed",
            description: "Could not rebuild image variants. Check server logs.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleCreate = () => {
    const slug = `gallery-${Date.now()}`;
    createGallery.mutate(
      { data: { title: "New Gallery", slug, published: false } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          toast({ title: "Gallery created" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteGallery.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
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
        <title>Galleries Management | Admin</title>
      </Helmet>

      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Galleries</h1>
            <p className="text-secondary">Manage portfolio galleries.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => runBackfill(false)}
              disabled={backfillVariants.isPending}
              data-testid="button-rebuild-image-variants"
              title="Generate any missing WebP thumb/medium variants for all gallery images."
            >
              {backfillVariants.isPending && !forceConfirmOpen ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Rebuild image variants
            </Button>
            <AlertDialog open={forceConfirmOpen} onOpenChange={setForceConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={backfillVariants.isPending}
                  data-testid="button-force-rebuild-image-variants"
                  title="Regenerate every variant from the original, even if one already exists."
                >
                  Force regenerate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Force regenerate all variants?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This re-encodes the WebP thumb and medium for every gallery image, even ones that already have variants. It can take a while and use a lot of CPU and storage. Continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setForceConfirmOpen(false);
                      runBackfill(true);
                    }}
                  >
                    Force regenerate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleCreate} disabled={createGallery.isPending} data-testid="button-new-gallery">
              <Plus className="h-4 w-4 mr-2" /> New Gallery
            </Button>
          </div>
        </div>

        <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : !galleries?.length ? (
            <div className="p-8 text-center text-muted-foreground">No galleries found. Create one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {galleries.map((gallery) => (
                    <TableRow key={gallery.id}>
                      <TableCell className="font-medium">{gallery.title}</TableCell>
                      <TableCell className="text-secondary">{gallery.location || "-"}</TableCell>
                      <TableCell>
                        {gallery.published ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/galleries/${gallery.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Gallery?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the gallery and all its images.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(gallery.id)} className="bg-destructive text-destructive-foreground">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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