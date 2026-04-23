import { Helmet } from "react-helmet-async";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Upload, Trash2, GripVertical, ArrowDownAZ, Save, Undo2 } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListGalleries,
  useUpdateGallery,
  useAddGalleryImage,
  useUpdateGalleryImage,
  useDeleteGalleryImage,
  useRequestUploadUrl,
  useReorderGalleryImages,
  getListGalleriesQueryKey,
  type GalleryImage,
} from "@workspace/api-client-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
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
import { imageVariantUrl } from "@/lib/galleryImage";

const gallerySchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  location: z.string().optional(),
  description: z.string().optional(),
  systemSizeKw: z.string().optional(),
  panelBrand: z.string().optional(),
  inverterBrand: z.string().optional(),
  installDate: z.string().optional(),
  durationDays: z.string().optional(),
  story: z.string().optional(),
  published: z.boolean().default(false),
});

function ImageMetaEditor({ image }: { image: GalleryImage }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [altText, setAltText] = useState(image.altText ?? "");
  const [caption, setCaption] = useState(image.caption ?? "");
  const update = useUpdateGalleryImage();

  const dirty = altText !== (image.altText ?? "") || caption !== (image.caption ?? "");

  const save = () => {
    update.mutate(
      { id: image.id, data: { altText: altText || null, caption: caption || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          toast({ title: "Image details saved" });
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs p-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Input
        aria-label="Alt text"
        placeholder="Alt text (for screen readers + SEO)"
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        className="h-7 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/60"
      />
      <Input
        aria-label="Caption"
        placeholder="Caption (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="h-7 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/60"
      />
      {dirty && (
        <Button size="sm" className="w-full h-7 text-xs" onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving..." : "Save"}
        </Button>
      )}
    </div>
  );
}

/**
 * Natural-order comparator: "KLS_2" sorts before "KLS_10". We strip the file
 * extension before comparing so two images that only differ in extension keep
 * a stable relative order.
 */
const filenameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
function filenameSortKey(img: GalleryImage): string {
  const raw = (img.altText?.trim() || img.objectPath.split("/").pop() || "").toLowerCase();
  const dot = raw.lastIndexOf(".");
  return dot > 0 ? raw.slice(0, dot) : raw;
}

function SortableImageTile({
  img,
  disabled,
  onDelete,
  deletePending,
}: {
  img: GalleryImage;
  disabled: boolean;
  onDelete: (id: number) => void;
  deletePending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`image-tile-${img.id}`}
      className="group relative aspect-square bg-muted rounded-md border border-border overflow-hidden"
    >
      <img
        src={imageVariantUrl(img.objectPath, "thumb")}
        loading="lazy"
        decoding="async"
        alt={img.altText || ""}
        className="w-full h-full object-cover pointer-events-none select-none"
      />
      <button
        type="button"
        aria-label="Drag to reorder"
        data-testid={`button-drag-${img.id}`}
        className="absolute top-1 left-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ImageMetaEditor image={img} />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" disabled={deletePending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the image from this gallery.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(img.id)}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export default function GalleryEdit() {
  const [, params] = useRoute("/admin/galleries/:id");
  const id = Number(params?.id);
  const { data: galleries, isLoading } = useListGalleries();
  const gallery = galleries?.find(g => g.id === id);

  const updateGallery = useUpdateGallery();
  const requestUpload = useRequestUploadUrl();
  const addImage = useAddGalleryImage();
  const deleteImage = useDeleteGalleryImage();
  const reorderImages = useReorderGalleryImages();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof gallerySchema>>({
    resolver: zodResolver(gallerySchema),
    values: {
      title: gallery?.title || "",
      slug: gallery?.slug || "",
      location: gallery?.location || "",
      description: gallery?.description || "",
      systemSizeKw:
        gallery?.systemSizeKw !== undefined && gallery?.systemSizeKw !== null
          ? String(gallery.systemSizeKw)
          : "",
      panelBrand: gallery?.panelBrand || "",
      inverterBrand: gallery?.inverterBrand || "",
      installDate: gallery?.installDate
        ? new Date(gallery.installDate).toISOString().slice(0, 10)
        : "",
      durationDays:
        gallery?.durationDays !== undefined && gallery?.durationDays !== null
          ? String(gallery.durationDays)
          : "",
      story: gallery?.story || "",
      published: gallery?.published || false,
    },
  });

  const onSubmit = (data: z.infer<typeof gallerySchema>) => {
    const systemSize = data.systemSizeKw?.trim();
    const duration = data.durationDays?.trim();
    const installDateStr = data.installDate?.trim();
    const payload = {
      title: data.title,
      slug: data.slug,
      location: data.location || null,
      description: data.description || null,
      systemSizeKw: systemSize ? Number(systemSize) : null,
      panelBrand: data.panelBrand?.trim() || null,
      inverterBrand: data.inverterBrand?.trim() || null,
      installDate: installDateStr || null,
      durationDays: duration ? Math.trunc(Number(duration)) : null,
      story: data.story?.trim() || null,
      published: data.published,
    };
    if (payload.systemSizeKw !== null && Number.isNaN(payload.systemSizeKw)) {
      toast({ title: "System size must be a number", variant: "destructive" });
      return;
    }
    if (payload.durationDays !== null && Number.isNaN(payload.durationDays)) {
      toast({ title: "Duration must be a whole number", variant: "destructive" });
      return;
    }
    if (payload.installDate && Number.isNaN(new Date(payload.installDate).getTime())) {
      toast({ title: "Install date is invalid", variant: "destructive" });
      return;
    }
    updateGallery.mutate(
      { id, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          toast({ title: "Gallery updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update gallery", variant: "destructive" });
        }
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Get upload URL
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type,
        }
      });

      // 2. Upload file
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      // 3. Add image to gallery
      await addImage.mutateAsync({
        id,
        data: {
          objectPath,
          sortOrder: gallery?.images ? gallery.images.length : 0,
        }
      });

      queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
      toast({ title: "Image uploaded successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = (imageId: number) => {
    deleteImage.mutate(
      { id: imageId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          toast({ title: "Image deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete image", variant: "destructive" });
        }
      }
    );
  };

  // --- Image ordering state ---
  // `serverOrder` is the order coming from the server (by sortOrder). `localOrder`
  // is the draft order the admin is editing — reordering via drag/drop or the
  // Sort-by-filename button mutates it, and Save order flushes it to the server.
  const serverImages = useMemo<GalleryImage[]>(
    () => gallery?.images ?? [],
    [gallery?.images],
  );
  const serverOrderIds = useMemo(() => serverImages.map((i) => i.id), [serverImages]);
  const [localOrderIds, setLocalOrderIds] = useState<number[]>(serverOrderIds);

  // Sync local order with the server, but don't trample an in-progress draft on
  // unrelated refetches (e.g. metadata save, window-focus refetch). We only
  // touch the draft when:
  //   1. The SET of image ids changed (an image was added or removed), in which
  //      case we must add/remove to stay in sync. We preserve the relative
  //      order of ids the draft already knows about and append/remove as
  //      needed.
  //   2. The local draft still matches some previous server order that just
  //      changed on the backend without user edits — then we take the new
  //      server order.
  useEffect(() => {
    setLocalOrderIds((prev) => {
      const prevSet = new Set(prev);
      const serverSet = new Set(serverOrderIds);
      const sameIdSet =
        prev.length === serverOrderIds.length &&
        prev.every((id) => serverSet.has(id));
      if (sameIdSet) {
        // The set of images is identical; keep whatever order the user has
        // locally. This preserves an in-progress draft across unrelated
        // refetches AND correctly handles our own reorder mutation where
        // `prev` already matches the new server order.
        return prev;
      }
      // Add/remove path: keep the order of ids still present in the server
      // set, then append any brand-new ids at the end in their server-order
      // position. This way, a draft survives an alt-text save that happens
      // while dragging, and a just-uploaded image appears at the bottom.
      const next = prev.filter((id) => serverSet.has(id));
      for (const id of serverOrderIds) {
        if (!prevSet.has(id)) next.push(id);
      }
      return next;
    });
  }, [serverOrderIds]);

  const imagesById = useMemo(() => {
    const m = new Map<number, GalleryImage>();
    for (const img of serverImages) m.set(img.id, img);
    return m;
  }, [serverImages]);

  const orderedImages = useMemo(
    () =>
      localOrderIds
        .map((id) => imagesById.get(id))
        .filter((img): img is GalleryImage => Boolean(img)),
    [localOrderIds, imagesById],
  );

  const isDirtyOrder =
    localOrderIds.length !== serverOrderIds.length ||
    localOrderIds.some((id, i) => id !== serverOrderIds[i]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = localOrderIds.indexOf(Number(active.id));
    const newIndex = localOrderIds.indexOf(Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setLocalOrderIds(arrayMove(localOrderIds, oldIndex, newIndex));
  };

  const sortByFilename = () => {
    const sorted = [...orderedImages].sort((a, b) =>
      filenameCollator.compare(filenameSortKey(a), filenameSortKey(b)),
    );
    setLocalOrderIds(sorted.map((i) => i.id));
  };

  const resetOrder = () => setLocalOrderIds(serverOrderIds);

  const saveOrder = () => {
    if (!gallery) return;
    reorderImages.mutate(
      { id: gallery.id, data: { imageIds: localOrderIds } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          toast({ title: "Image order saved" });
        },
        onError: () => {
          toast({ title: "Failed to save order", variant: "destructive" });
        },
      },
    );
  };

  const orderDisabled = reorderImages.isPending || isUploading;

  if (isLoading || !gallery) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Edit Gallery | Admin</title>
      </Helmet>

      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/galleries">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Gallery</h1>
            <p className="text-secondary">{gallery.title}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-background rounded-lg border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Gallery Details</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea className="min-h-[100px]" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Project Specs</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="systemSizeKw"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>System size (kW)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" min="0" placeholder="e.g. 7.5" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="durationDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Build (days)</FormLabel>
                              <FormControl>
                                <Input type="number" step="1" min="0" placeholder="e.g. 3" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="panelBrand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Panel brand</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. REC Alpha Pure 410W" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="inverterBrand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Inverter brand</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Enphase IQ8+" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="installDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Install date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="story"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project story</FormLabel>
                            <FormControl>
                              <Textarea
                                className="min-h-[160px]"
                                placeholder="Tell the story of this install — challenges overcome, customer goals, anything notable. Markdown / line breaks are preserved."
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Published</FormLabel>
                          <p className="text-sm text-secondary">Make this gallery visible to the public.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={updateGallery.isPending}>
                    {updateGallery.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-background rounded-lg border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-foreground">Images</h2>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? "Uploading..." : <><Upload className="h-4 w-4 mr-2" /> Upload Image</>}
                  </Button>
                </div>
              </div>

              {orderedImages.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-md border border-border bg-muted/40">
                  <span className="text-sm text-secondary mr-auto">
                    Drag tiles by the grip handle to rearrange, or click{" "}
                    <span className="font-medium">Sort by filename</span>.
                  </span>
                  {isDirtyOrder && (
                    <span
                      data-testid="badge-unsaved-order"
                      className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-0.5 font-medium"
                    >
                      Unsaved order changes
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sortByFilename}
                    disabled={orderDisabled}
                    data-testid="button-sort-by-filename"
                  >
                    <ArrowDownAZ className="h-4 w-4 mr-2" />
                    Sort by filename
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetOrder}
                    disabled={orderDisabled || !isDirtyOrder}
                    data-testid="button-reset-order"
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveOrder}
                    disabled={orderDisabled || !isDirtyOrder}
                    data-testid="button-save-order"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {reorderImages.isPending ? "Saving..." : "Save order"}
                  </Button>
                </div>
              )}

              {orderedImages.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={localOrderIds} strategy={rectSortingStrategy}>
                    <div
                      className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"
                      data-testid="image-grid"
                    >
                      {orderedImages.map((img) => (
                        <SortableImageTile
                          key={img.id}
                          img={img}
                          disabled={orderDisabled}
                          onDelete={handleDeleteImage}
                          deletePending={deleteImage.isPending}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-12 bg-muted/50 rounded-lg border border-dashed border-border">
                  <p className="text-secondary mb-4">No images yet. Upload some photos to get started.</p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    Upload First Image
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}