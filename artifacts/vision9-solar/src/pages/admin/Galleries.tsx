import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Plus, Edit2, Trash2, RefreshCw, Loader2 } from "lucide-react";
import {
  useListGalleries,
  useCreateGallery,
  useDeleteGallery,
  useBackfillImageVariants,
  useGetImageVariantsStatus,
  useListImagesMissingVariants,
  useRegenerateImageVariants,
  getGetImageVariantsStatusQueryKey,
  getListImagesMissingVariantsQueryKey,
  getListGalleriesQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const variantsStatus = useGetImageVariantsStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const missingImages = useListImagesMissingVariants({
    query: {
      enabled: missingDialogOpen,
      queryKey: getListImagesMissingVariantsQueryKey(),
    },
  });
  const regenerateOne = useRegenerateImageVariants();

  const invalidateVariantQueries = () => {
    queryClient.invalidateQueries({ queryKey: getGetImageVariantsStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListImagesMissingVariantsQueryKey() });
  };

  const handleRegenerateOne = (id: number) => {
    regenerateOne.mutate(
      { id },
      {
        onSuccess: (result) => {
          toast({
            title: "Variants regenerated",
            description:
              result.generated.length === 0
                ? "All variants already existed."
                : `Generated: ${result.generated.join(", ")}.`,
          });
          invalidateVariantQueries();
        },
        onError: () => {
          toast({
            title: "Regenerate failed",
            description: "Could not regenerate variants for this image.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const runBackfill = (force: boolean) => {
    backfillVariants.mutate(
      { params: force ? { force: "1" } : undefined },
      {
        onSuccess: (result) => {
          toast({
            title: force ? "Force regenerate complete" : "Backfill complete",
            description: `Total: ${result.total} · Processed: ${result.processed} · Variants generated: ${result.generated} · Failed: ${result.failed}`,
          });
          invalidateVariantQueries();
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
            {(() => {
              const status = variantsStatus.data;
              const hasMissing =
                !!status &&
                status.totalImages > 0 &&
                (status.missingThumb > 0 || status.missingMedium > 0);
              const statusText = variantsStatus.isLoading
                ? "Checking image variants..."
                : variantsStatus.isError || !status
                  ? "Image variant status unavailable."
                  : status.totalImages === 0
                    ? "No gallery images yet."
                    : !hasMissing
                      ? `All ${status.totalImages} images have WebP variants.`
                      : `${status.missingThumb} of ${status.totalImages} images missing thumb · ${status.missingMedium} of ${status.totalImages} missing medium WebP variants.`;
              return (
                <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
                  {hasMissing ? (
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm text-muted-foreground mt-1 underline-offset-2 hover:underline focus:underline focus:outline-none text-left"
                        data-testid="button-image-variants-status"
                      >
                        {statusText}
                        <span className="ml-1 text-xs">(view affected)</span>
                      </button>
                    </DialogTrigger>
                  ) : (
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      data-testid="text-image-variants-status"
                    >
                      {statusText}
                    </p>
                  )}
                  <DialogContent className="max-w-3xl" data-testid="dialog-missing-variants">
                    <DialogHeader>
                      <DialogTitle>Images missing WebP variants</DialogTitle>
                      <DialogDescription>
                        These gallery images are missing one or more optimized
                        variants. Regenerate individually or use Rebuild image
                        variants to process all at once.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {missingImages.isLoading ? (
                        <div className="p-6 text-center text-muted-foreground">
                          Loading…
                        </div>
                      ) : missingImages.isError ? (
                        <div className="p-6 text-center text-destructive">
                          Could not load the list of affected images.
                        </div>
                      ) : !missingImages.data?.length ? (
                        <div className="p-6 text-center text-muted-foreground">
                          No images are missing variants.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Image</TableHead>
                              <TableHead>Gallery</TableHead>
                              <TableHead>Missing</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {missingImages.data.map((img) => {
                              const label =
                                img.caption?.trim() ||
                                img.altText?.trim() ||
                                img.objectPath.split("/").pop() ||
                                img.objectPath;
                              return (
                                <TableRow
                                  key={img.id}
                                  data-testid={`row-missing-image-${img.id}`}
                                >
                                  <TableCell className="font-medium max-w-[260px]">
                                    <div className="truncate" title={label}>
                                      {label}
                                    </div>
                                    <div
                                      className="text-xs text-muted-foreground truncate"
                                      title={img.objectPath}
                                    >
                                      {img.objectPath}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Link
                                      href={`/admin/galleries/${img.galleryId}`}
                                      className="hover:underline"
                                    >
                                      {img.galleryTitle}
                                    </Link>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {img.missingVariants.map((v) => (
                                        <Badge key={v} variant="secondary">
                                          {v}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRegenerateOne(img.id)}
                                      disabled={
                                        regenerateOne.isPending &&
                                        regenerateOne.variables?.id === img.id
                                      }
                                      data-testid={`button-regenerate-image-${img.id}`}
                                    >
                                      {regenerateOne.isPending &&
                                      regenerateOne.variables?.id === img.id ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                      )}
                                      Regenerate
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })()}
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