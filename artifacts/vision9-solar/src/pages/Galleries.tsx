import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowRight, Image as ImageIcon, Zap } from "lucide-react";
import { useListPublicGalleries } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { imageVariantUrl, imageSrcSet } from "@/lib/galleryImage";

export default function Galleries() {
  const { data: galleries, isLoading } = useListPublicGalleries();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Project Galleries | Vision9 Solar Inc.",
    "description": "View our portfolio of solar net-metering and off-grid installations across Ontario."
  };

  return (
    <>
      <Helmet>
        <title>Project Galleries | Vision9 Solar Inc.</title>
        <meta name="description" content="View our portfolio of solar net-metering and off-grid installations across Ontario." />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <section className="bg-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Project Galleries</h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto">Browse our recent solar installations and off-grid builds.</p>
        </div>
      </section>

      <section className="py-20 min-h-[50vh]">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-muted rounded-lg h-64 border border-border"></div>
              ))}
            </div>
          ) : galleries && galleries.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {galleries.map((gallery) => {
                const coverImage = gallery.images[0];
                const installYear = gallery.installDate
                  ? (() => {
                      const d = new Date(gallery.installDate);
                      return Number.isNaN(d.getTime()) ? null : d.getFullYear();
                    })()
                  : null;
                const hasSize = gallery.systemSizeKw != null;
                return (
                  <Link key={gallery.id} href={`/galleries/${gallery.slug}`}>
                    <a className="group block bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow hover-elevate">
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden flex items-center justify-center">
                        {coverImage ? (
                          <img
                            src={imageVariantUrl(coverImage.objectPath, "medium")}
                            srcSet={imageSrcSet(coverImage.objectPath)}
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            loading="lazy"
                            decoding="async"
                            alt={coverImage.altText || gallery.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        )}
                        <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-foreground flex items-center gap-1 shadow-sm">
                          <ImageIcon className="h-3 w-3" />
                          {gallery.images.length}
                        </div>
                        {hasSize && (
                          <div
                            className="absolute top-3 left-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm"
                            data-testid={`chip-system-size-${gallery.slug}`}
                          >
                            <Zap className="h-3 w-3" />
                            <span>{gallery.systemSizeKw} kW</span>
                            {installYear && (
                              <span className="opacity-80 font-medium">· {installYear}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{gallery.title}</h2>
                        {gallery.location && (
                          <p className="text-sm font-medium text-primary mb-3">{gallery.location}</p>
                        )}
                        {gallery.description && (
                          <p className="text-secondary line-clamp-2 text-sm">{gallery.description}</p>
                        )}
                        <div className="mt-4 flex items-center text-sm font-semibold text-primary">
                          View Gallery <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </a>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-lg border border-border">
              <ImageIcon className="h-12 w-12 text-secondary mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-foreground mb-2">No galleries found</h2>
              <p className="text-secondary">Check back soon for updates to our portfolio.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}