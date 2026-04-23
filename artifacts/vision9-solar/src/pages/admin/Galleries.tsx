import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  ImageOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { imageVariantUrl } from "@/lib/galleryImage";
import {
  useListGalleries,
  useCreateGallery,
  useDeleteGallery,
  useStartBackfillImageVariants,
  useGetBackfillImageVariantsJob,
  getGetBackfillImageVariantsJobQueryKey,
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
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

function MissingImageThumbnail({
  objectPath,
  alt,
  onOpen,
}: {
  objectPath: string;
  alt: string;
  onOpen: () => void;
}) {
  const [errored, setErrored] = useState(false);
  const fullSrc = imageVariantUrl(objectPath, "full");
  if (errored) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted flex items-center justify-center">
        <ImageOff
          className="h-5 w-5 text-muted-foreground"
          aria-label="Preview unavailable"
          data-testid={`thumb-missing-${objectPath}`}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Preview ${alt} at full size`}
      data-testid={`button-thumb-${objectPath}`}
    >
      <img
        src={fullSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        onError={() => setErrored(true)}
        data-testid={`thumb-image-${objectPath}`}
      />
    </button>
  );
}

function MissingImagesLightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: { objectPath: string; alt: string }[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null && index >= 0 && index < items.length;
  const current = open ? items[index!] : null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange((index! - 1 + items.length) % items.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange((index! + 1) % items.length);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, index, items.length, onIndexChange]);

  if (!current) return null;
  const fullSrc = imageVariantUrl(current.objectPath, "full");
  const goPrev = () =>
    onIndexChange((index! - 1 + items.length) % items.length);
  const goNext = () => onIndexChange((index! + 1) % items.length);
  const multiple = items.length > 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-w-4xl p-2 sm:p-4 bg-background"
        data-testid="lightbox-missing-variants"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{current.alt}</DialogTitle>
          <DialogDescription>{current.objectPath}</DialogDescription>
        </DialogHeader>
        <div className="relative flex items-center justify-center max-h-[80vh] overflow-hidden">
          <img
            src={fullSrc}
            alt={current.alt}
            className="max-h-[80vh] w-auto h-auto object-contain"
            data-testid={`lightbox-image-${current.objectPath}`}
          />
          {multiple && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
                onClick={goPrev}
                aria-label="Previous image"
                data-testid="button-lightbox-prev"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
                onClick={goNext}
                aria-label="Next image"
                data-testid="button-lightbox-next"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
        <div
          className="mt-2 text-center text-sm text-muted-foreground"
          data-testid="text-lightbox-counter"
        >
          {index! + 1} of {items.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GalleriesAdmin() {
  const { data: galleries, isLoading } = useListGalleries();
  const createGallery = useCreateGallery();
  const deleteGallery = useDeleteGallery();
  const startBackfill = useStartBackfillImageVariants();
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
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!missingDialogOpen) {
      setSelectedIds(new Set());
    }
  }, [missingDialogOpen]);

  const availableIds = useMemo<number[]>(
    () => missingImages.data?.map((img: { id: number }) => img.id) ?? [],
    [missingImages.data],
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const allowed = new Set(availableIds);
      let changed = false;
      const next = new Set<number>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [availableIds]);

  const allSelected =
    availableIds.length > 0 && selectedIds.size === availableIds.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(availableIds) : new Set());
  };

  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobForce, setActiveJobForce] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxItems = (missingImages.data ?? []).map((img) => ({
    objectPath: img.objectPath,
    alt:
      img.caption?.trim() ||
      img.altText?.trim() ||
      img.objectPath.split("/").pop() ||
      img.objectPath,
  }));

  useEffect(() => {
    if (lightboxIndex === null) return;
    if (lightboxIndex >= lightboxItems.length) {
      setLightboxIndex(lightboxItems.length > 0 ? lightboxItems.length - 1 : null);
    }
  }, [lightboxIndex, lightboxItems.length]);

  const invalidateVariantQueries = () => {
    queryClient.invalidateQueries({ queryKey: getGetImageVariantsStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListImagesMissingVariantsQueryKey() });
  };

  const runBulkRegenerate = async (
    ids: number[],
    mode: "all" | "selected",
  ) => {
    if (!ids.length) return;
    setBulkRegenerating(true);
    setBulkProgress({ done: 0, total: ids.length });
    let succeeded = 0;
    let failed = 0;
    let totalGenerated = 0;
    for (const id of ids) {
      try {
        const result = await regenerateOne.mutateAsync({ id });
        succeeded += 1;
        totalGenerated += result.generated.length;
      } catch {
        failed += 1;
      }
      setBulkProgress((p) => ({ done: p.done + 1, total: ids.length }));
    }
    setBulkRegenerating(false);
    invalidateVariantQueries();
    if (mode === "selected") {
      setSelectedIds(new Set());
    }
    const successTitle =
      mode === "selected"
        ? "Regenerated selected images"
        : "Regenerated all listed images";
    toast({
      title: failed === 0 ? successTitle : "Regenerate finished with errors",
      description: `Processed: ${succeeded + failed} of ${ids.length} · Variants generated: ${totalGenerated} · Failed: ${failed}`,
      variant: failed === 0 ? undefined : "destructive",
    });
  };

  const handleRegenerateAllListed = () => {
    const imgs = missingImages.data;
    if (!imgs?.length) return;
    void runBulkRegenerate(imgs.map((i: { id: number }) => i.id), "all");
  };

  const handleRegenerateSelected = () => {
    const ids = ((missingImages.data ?? []) as { id: number }[])
      .map((i) => i.id)
      .filter((id) => selectedIds.has(id));
    if (!ids.length) return;
    void runBulkRegenerate(ids, "selected");
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

  const jobQuery = useGetBackfillImageVariantsJob(activeJobId ?? "", {
    query: {
      queryKey: getGetBackfillImageVariantsJobQueryKey(activeJobId ?? ""),
      enabled: !!activeJobId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return 1000;
        return data.state === "completed" || data.state === "failed"
          ? false
          : 1000;
      },
    },
  });

  const job = jobQuery.data;
  const isJobRunning =
    !!activeJobId && (!job || job.state === "pending" || job.state === "running");

  useEffect(() => {
    if (!job || !activeJobId) return;
    if (job.state === "completed") {
      toast({
        title: activeJobForce ? "Force regenerate complete" : "Backfill complete",
        description: `Total: ${job.total} · Processed: ${job.processed} · Variants generated: ${job.generated} · Failed: ${job.failed}`,
      });
      invalidateVariantQueries();
      setActiveJobId(null);
    } else if (job.state === "failed") {
      toast({
        title: "Backfill failed",
        description: job.error ?? "Could not rebuild image variants. Check server logs.",
        variant: "destructive",
      });
      setActiveJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, activeJobId, activeJobForce, toast]);

  const runBackfill = (force: boolean) => {
    setActiveJobForce(force);
    startBackfill.mutate(
      { params: force ? { force: "1" } : undefined },
      {
        onSuccess: (result) => {
          setActiveJobId(result.jobId);
        },
        onError: () => {
          toast({
            title: "Backfill failed to start",
            description: "Could not kick off the rebuild. Check server logs.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const progressPct =
    job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

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
                <Dialog
                  open={missingDialogOpen}
                  onOpenChange={(open) => {
                    setMissingDialogOpen(open);
                    if (!open) setLightboxIndex(null);
                  }}
                >
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
                        variants. Regenerate individually, regenerate all listed
                        below, or use Rebuild image variants to process every
                        gallery image.
                      </DialogDescription>
                    </DialogHeader>
                    {!!missingImages.data?.length && (
                      <div className="flex items-center justify-between gap-2 pb-2">
                        <div
                          className="text-sm text-muted-foreground"
                          data-testid="text-bulk-regenerate-progress"
                        >
                          {bulkRegenerating
                            ? `Regenerating ${bulkProgress.done} of ${bulkProgress.total}…`
                            : selectedIds.size > 0
                              ? `${selectedIds.size} of ${missingImages.data.length} selected`
                              : `${missingImages.data.length} image${missingImages.data.length === 1 ? "" : "s"} affected`}
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedIds.size > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRegenerateSelected}
                              disabled={bulkRegenerating || regenerateOne.isPending}
                              data-testid="button-regenerate-selected"
                              title="Regenerate variants for the rows you have checked."
                            >
                              {bulkRegenerating ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              Regenerate selected ({selectedIds.size})
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerateAllListed}
                            disabled={bulkRegenerating || regenerateOne.isPending}
                            data-testid="button-regenerate-all-listed"
                            title="Regenerate variants for every image currently shown in this list."
                          >
                            {bulkRegenerating ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Regenerate all listed
                          </Button>
                        </div>
                      </div>
                    )}
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
                              <TableHead className="w-[40px]">
                                <Checkbox
                                  checked={
                                    allSelected
                                      ? true
                                      : someSelected
                                        ? "indeterminate"
                                        : false
                                  }
                                  onCheckedChange={(checked) =>
                                    toggleSelectAll(checked === true)
                                  }
                                  disabled={bulkRegenerating}
                                  aria-label="Select all affected images"
                                  data-testid="checkbox-select-all-missing"
                                />
                              </TableHead>
                              <TableHead>Image</TableHead>
                              <TableHead>Gallery</TableHead>
                              <TableHead>Missing</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {missingImages.data.map((img, idx) => {
                              const label =
                                img.caption?.trim() ||
                                img.altText?.trim() ||
                                img.objectPath.split("/").pop() ||
                                img.objectPath;
                              return (
                                <TableRow
                                  key={img.id}
                                  data-testid={`row-missing-image-${img.id}`}
                                  data-state={
                                    selectedIds.has(img.id) ? "selected" : undefined
                                  }
                                >
                                  <TableCell className="w-[40px]">
                                    <Checkbox
                                      checked={selectedIds.has(img.id)}
                                      onCheckedChange={(checked) =>
                                        toggleSelectOne(img.id, checked === true)
                                      }
                                      disabled={bulkRegenerating}
                                      aria-label={`Select ${label}`}
                                      data-testid={`checkbox-select-missing-${img.id}`}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium max-w-[260px]">
                                    <div className="flex items-center gap-3">
                                      <MissingImageThumbnail
                                        objectPath={img.objectPath}
                                        alt={label}
                                        onOpen={() => setLightboxIndex(idx)}
                                      />
                                      <div className="min-w-0">
                                        <div className="truncate" title={label}>
                                          {label}
                                        </div>
                                        <div
                                          className="text-xs text-muted-foreground truncate"
                                          title={img.objectPath}
                                        >
                                          {img.objectPath}
                                        </div>
                                      </div>
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
                                        bulkRegenerating ||
                                        (regenerateOne.isPending &&
                                          regenerateOne.variables?.id === img.id)
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
                    <MissingImagesLightbox
                      items={lightboxItems}
                      index={lightboxIndex}
                      onIndexChange={setLightboxIndex}
                      onClose={() => setLightboxIndex(null)}
                    />
                  </DialogContent>
                </Dialog>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => runBackfill(false)}
              disabled={isJobRunning || startBackfill.isPending}
              data-testid="button-rebuild-image-variants"
              title="Generate any missing WebP thumb/medium variants for all gallery images."
            >
              {isJobRunning || startBackfill.isPending ? (
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
                  disabled={isJobRunning || startBackfill.isPending}
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

        {isJobRunning && (
          <div
            className="rounded-lg border border-border bg-background p-4 shadow-sm"
            data-testid="backfill-progress"
          >
            <div className="flex items-center justify-between text-sm font-medium text-foreground">
              <span>
                {activeJobForce
                  ? "Force regenerating image variants…"
                  : "Rebuilding image variants…"}
              </span>
              <span className="text-secondary">
                {job ? `${job.processed} / ${job.total}` : "Starting…"}
                {job && job.failed > 0 ? ` · ${job.failed} failed` : ""}
              </span>
            </div>
            <Progress
              value={job && job.total > 0 ? progressPct : 0}
              className="mt-2"
            />
          </div>
        )}

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