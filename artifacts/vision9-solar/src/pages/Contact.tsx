import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { submitContactSubmission } from "@/lib/publicForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { TurnstileWidget, TURNSTILE_CONFIGURED } from "@/components/forms/TurnstileWidget";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/motion";
import {
  OFFICES,
  SITE_CONTACT,
  buildMapsEmbedSrc,
} from "@/lib/siteContact";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address").max(320),
  phone: z.string().max(50).optional(),
  subject: z.string().max(300).optional(),
  message: z.string().min(1, "Message is required").max(5000),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const { toast } = useToast();
  const createContact = useMutation({ mutationFn: submitContactSubmission });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [widgetResetKey, setWidgetResetKey] = useState(0);
  const mountedAtRef = useRef<number>(Date.now());

  function resetForAnotherSubmission() {
    createContact.reset();
    setCaptchaToken(null);
    setHoneypot("");
    setWidgetResetKey((k) => k + 1);
    mountedAtRef.current = Date.now();
  }

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  function onSubmit(data: ContactFormValues) {
    if (TURNSTILE_CONFIGURED && !captchaToken) {
      toast({
        title: "Verification needed",
        description: "Please complete the human verification before sending.",
        variant: "destructive",
      });
      return;
    }
    createContact.mutate(
      {
        ...data,
        turnstileToken: captchaToken,
        website: honeypot,
        formMountedAt: mountedAtRef.current,
      },
      {
        onSuccess: () => {
          toast({
            title: "Message Sent",
            description: "We've received your message and will get back to you shortly.",
          });
          form.reset();
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description:
              error?.message ||
              "There was a problem sending your message. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <>
      <Helmet>
        <title>Contact Us | Vision9 Solar Inc.</title>
        <meta name="description" content="Contact Vision9 Solar Inc. for your solar installation needs. Offices in Marmora and Chaput Hughes, Ontario." />
      </Helmet>

      <section className="bg-primary/10 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-5 leading-[1.05] tracking-tight">Contact Us</h1>
            <p className="text-xl md:text-2xl text-secondary max-w-2xl mx-auto leading-relaxed">Get in touch with our team of solar experts.</p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16">
          
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Send us a message</h2>
            {createContact.isSuccess ? (
              <div className="bg-muted p-8 rounded text-center border border-border">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Message Sent Successfully!</h3>
                <p className="text-secondary mb-6">Thank you for reaching out. A member of our team will contact you shortly.</p>
                <Button onClick={resetForAnotherSubmission} variant="outline">Send Another Message</Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(613) 555-0123" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="How can we help?" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Please provide details about your inquiry..." className="min-h-[150px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                  />

                  <TurnstileWidget onToken={setCaptchaToken} resetKey={widgetResetKey} />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full md:w-auto font-bold rounded"
                    disabled={
                      createContact.isPending ||
                      !TURNSTILE_CONFIGURED ||
                      !captchaToken
                    }
                  >
                    {createContact.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            )}
          </Reveal>

          <Reveal className="space-y-12" delay={0.1}>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Contact Information</h2>
              <div className="bg-muted p-8 rounded border border-border space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Sales & Support</h3>
                    <a
                      href={`tel:${SITE_CONTACT.primaryPhoneTel}`}
                      className="text-secondary hover:text-primary transition-colors text-lg"
                    >
                      {SITE_CONTACT.primaryPhoneDisplay}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Email</h3>
                    <a
                      href={SITE_CONTACT.emailHref}
                      className="text-secondary hover:text-primary transition-colors text-lg"
                    >
                      {SITE_CONTACT.emailDisplay}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Our Offices</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {OFFICES.map((office) => (
                  <div
                    key={office.id}
                    className="bg-background border border-border p-6 rounded shadow-sm"
                  >
                    <MapPin className="h-8 w-8 text-primary mb-4" />
                    <h3 className="font-bold text-foreground text-lg mb-2">{office.region}</h3>
                    {office.street ? (
                      <p className="text-secondary">{office.street}</p>
                    ) : null}
                    <p className="text-secondary">{office.locality}, {office.province}</p>
                    <p className="text-secondary">{office.postalCode}</p>
                    {office.phoneTel && office.phoneDisplay ? (
                      <a
                        href={`tel:${office.phoneTel}`}
                        className="inline-flex items-center gap-2 mt-3 text-secondary hover:text-primary transition-colors"
                      >
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{office.phoneDisplay}</span>
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {(() => {
              const mappedOffice = OFFICES.find((o) => o.mapEmbedQuery && o.mapShortUrl);
              if (!mappedOffice || !mappedOffice.mapEmbedQuery || !mappedOffice.mapShortUrl) {
                return null;
              }
              const embedSrc = buildMapsEmbedSrc(mappedOffice.mapEmbedQuery);
              return (
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    Find {mappedOffice.region}
                  </h2>
                  <div className="bg-background border border-border rounded shadow-sm overflow-hidden">
                    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                      <iframe
                        src={embedSrc}
                        title={`Google Map showing the Vision9 ${mappedOffice.region} office at ${mappedOffice.mapEmbedQuery}`}
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full border-0"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-t border-border bg-muted">
                      <p className="text-sm text-secondary">
                        {mappedOffice.street ? `${mappedOffice.street}, ` : ""}
                        {mappedOffice.locality}, {mappedOffice.province} {mappedOffice.postalCode}
                      </p>
                      <a
                        href={mappedOffice.mapShortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Open in Google Maps →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Reveal>

        </div>
      </section>
    </>
  );
}