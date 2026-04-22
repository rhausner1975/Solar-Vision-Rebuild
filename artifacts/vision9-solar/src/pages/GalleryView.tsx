import { Helmet } from "react-helmet-async";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useGetPublicGallery, getGetPublicGalleryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function GalleryView() {
  const [, params] = useRoute("/galleries/:slug");
  const slug = params?.slug || "";
  
  const { data: gallery, isLoading, error } = useGetPublicGallery(slug, {
    query: {
      queryKey: getGetPublicGalleryQueryKey(slug),
      enabled: !!slug
    }
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = gallery?.images || [];

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? Math.max(0, images.length - 1) : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, handlePrevious, handleNext]);

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center">Loading gallery...</div>;
  }

  if (error || !gallery) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Gallery not found</h2>
        <Button asChild><Link href="/galleries">Back to Galleries</Link></Button>
      </div>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "name": gallery.title,
    "description": gallery.description || "",
    "image": images.map(img => `https://vision9solar.com/api/storage${img.objectPath}`)
  };

  // 5 image strip logic
  const stripStart = Math.max(0, Math.min(currentIndex - 2, images.length - 5));
  const stripImages = images.slice(stripStart, stripStart + 5);

  return (
    <>
      <Helmet>
        <title>{`${gallery.title} | Vision9 Solar Inc.`}</title>
        <meta name="description" content={gallery.description || `View photos from our ${gallery.title} project.`} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <section className="bg-primary/10 py-12">
        <div className="container mx-auto px-4">
          <Button variant="ghost" asChild className="mb-6 -ml-4">
            <Link href="/galleries" className="flex items-center text-secondary hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Galleries
            </Link>
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{gallery.title}</h1>
          {gallery.location && <p className="text-primary font-medium mb-4">{gallery.location}</p>}
          {gallery.description && <p className="text-secondary max-w-3xl text-lg">{gallery.description}</p>}
        </div>
      </section>

      <section className="py-12 min-h-[50vh] bg-background">
        <div className="container mx-auto px-4">
          {images.length > 0 ? (
            <div className="max-w-5xl mx-auto">
              {/* Main Display Image */}
              <div 
                className="aspect-video bg-muted rounded-lg overflow-hidden relative cursor-zoom-in mb-6 flex items-center justify-center border border-border shadow-sm group"
                onClick={() => setLightboxOpen(true)}
              >
                <img 
                  src={`/api/storage${images[currentIndex].objectPath}`} 
                  alt={images[currentIndex].altText || gallery.title}
                  className="max-w-full max-h-full object-contain"
                />
                {images[currentIndex].caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur text-foreground p-3 text-center text-sm border-t border-border">
                    {images[currentIndex].caption}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-background/90 text-foreground px-4 py-2 rounded-full font-medium shadow-lg flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Click to enlarge
                  </span>
                </div>
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 md:gap-4 relative">
                  <Button variant="outline" size="icon" onClick={handlePrevious} className="rounded-full shrink-0" disabled={images.length <= 1}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <div className="flex gap-2 overflow-hidden px-1 py-1">
                    {stripImages.map((img) => {
                      const actualIndex = images.findIndex(i => i.id === img.id);
                      const isActive = actualIndex === currentIndex;
                      return (
                        <button
                          key={img.id}
                          onClick={() => setCurrentIndex(actualIndex)}
                          className={`relative aspect-square w-16 md:w-24 shrink-0 rounded overflow-hidden border-2 transition-all ${
                            isActive ? "border-primary shadow-md scale-105 z-10" : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img 
                            src={`/api/storage${img.objectPath}`} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>

                  <Button variant="outline" size="icon" onClick={handleNext} className="rounded-full shrink-0" disabled={images.length <= 1}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-lg border border-border">
              <ImageIcon className="h-12 w-12 text-secondary mx-auto mb-4 opacity-50" />
              <p className="text-secondary">No images in this gallery.</p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 bg-black/95 border-none flex flex-col [&>button]:hidden">
          <DialogTitle className="sr-only">Gallery Image</DialogTitle>
          <DialogDescription className="sr-only">Fullscreen gallery view</DialogDescription>
          
          {images.length > 0 && (
            <>
              <div className="flex justify-between items-center p-4 text-white absolute top-0 inset-x-0 z-50 bg-gradient-to-b from-black/60 to-transparent">
                <div className="text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setLightboxOpen(false)} className="text-white hover:bg-white/20 rounded-full">
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <img 
                  src={`/api/storage${images[currentIndex].objectPath}`} 
                  alt={images[currentIndex].altText || ""}
                  className="max-w-full max-h-full object-contain"
                />
                
                {images.length > 1 && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleNext(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </>
                )}
              </div>
              
              {images[currentIndex].caption && (
                <div className="absolute bottom-0 inset-x-0 p-6 text-center text-white bg-gradient-to-t from-black/80 to-transparent">
                  <p className="max-w-3xl mx-auto">{images[currentIndex].caption}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}