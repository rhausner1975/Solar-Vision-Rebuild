import { Helmet } from "react-helmet-async";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Upload, Trash2, Plus, GripVertical } from "lucide-react";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useListGalleries, 
  useUpdateGallery,
  useAddGalleryImage,
  useDeleteGalleryImage,
  useRequestUploadUrl,
  getListGalleriesQueryKey
} from "@workspace/api-client-react";
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

const gallerySchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  location: z.string().optional(),
  description: z.string().optional(),
  published: z.boolean().default(false),
});

export default function GalleryEdit() {
  const [, params] = useRoute("/admin/galleries/:id");
  const id = Number(params?.id);
  const { data: galleries, isLoading } = useListGalleries();
  const gallery = galleries?.find(g => g.id === id);
  
  const updateGallery = useUpdateGallery();
  const requestUpload = useRequestUploadUrl();
  const addImage = useAddGalleryImage();
  const deleteImage = useDeleteGalleryImage();
  
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
      published: gallery?.published || false,
    },
  });

  const onSubmit = (data: z.infer<typeof gallerySchema>) => {
    updateGallery.mutate(
      { id, data },
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
              <div className="flex items-center justify-between mb-6">
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

              {gallery.images && gallery.images.length > 0 ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.images.map((img) => (
                    <div key={img.id} className="group relative aspect-square bg-muted rounded-md border border-border overflow-hidden">
                      <img 
                        src={`/api/storage${img.objectPath}`} 
                        alt={img.altText || ""} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
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
                              <AlertDialogAction onClick={() => handleDeleteImage(img.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
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