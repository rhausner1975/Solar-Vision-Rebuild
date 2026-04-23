import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { submitEstimateRequest } from "@/lib/publicForms";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const estimateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address").max(320),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  propertyType: z.string().max(100).optional(),
  projectType: z.string().max(200).optional(),
  monthlyBill: z.string().max(100).optional(),
  timeline: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

type EstimateFormValues = z.infer<typeof estimateSchema>;

export default function Estimates() {
  const { toast } = useToast();
  const createEstimate = useMutation({ mutationFn: submitEstimateRequest });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [widgetResetKey, setWidgetResetKey] = useState(0);
  const mountedAtRef = useRef<number>(Date.now());

  function resetForAnotherSubmission() {
    createEstimate.reset();
    setCaptchaToken(null);
    setHoneypot("");
    setWidgetResetKey((k) => k + 1);
    mountedAtRef.current = Date.now();
  }

  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      propertyType: "",
      projectType: "",
      monthlyBill: "",
      timeline: "",
      notes: "",
    },
  });

  function onSubmit(data: EstimateFormValues) {
    if (TURNSTILE_CONFIGURED && !captchaToken) {
      toast({
        title: "Verification needed",
        description: "Please complete the human verification before submitting.",
        variant: "destructive",
      });
      return;
    }
    createEstimate.mutate(
      {
        ...data,
        turnstileToken: captchaToken,
        website: honeypot,
        formMountedAt: mountedAtRef.current,
      },
      {
        onSuccess: () => {
          toast({
            title: "Estimate Request Sent",
            description: "We will review your details and get back to you soon.",
          });
          form.reset();
        },
        onError: () => {
          toast({
            title: "Error",
            description: "There was a problem sending your request. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <>
      <Helmet>
        <title>Request an Estimate | Vision9 Solar Inc.</title>
        <meta name="description" content="Request an estimate for your solar net-metering or off-grid project in Ontario." />
      </Helmet>

      <section className="bg-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Request an Estimate</h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto">Provide some details about your project and we'll get back to you with a tailored solution.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {createEstimate.isSuccess ? (
            <div className="bg-muted p-12 rounded-lg text-center border border-border shadow-sm">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-foreground mb-3">Request Submitted Successfully!</h2>
              <p className="text-secondary text-lg mb-8">Thank you for your interest. A solar engineer will review your project details and contact you shortly.</p>
              <Button onClick={resetForAnotherSubmission} variant="outline" size="lg">Submit Another Request</Button>
            </div>
          ) : (
            <div className="bg-background border border-border rounded-lg shadow-sm p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-b pb-2">Contact Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Project Address</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-b pb-2 pt-4">Project Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="propertyType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Residential">Residential</SelectItem>
                              <SelectItem value="Commercial">Commercial</SelectItem>
                              <SelectItem value="Cottage/Remote">Cottage / Remote</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="projectType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Net Metering">Net Metering</SelectItem>
                              <SelectItem value="Off-Grid">Off-Grid</SelectItem>
                              <SelectItem value="O&M / Service">O&M / Service</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="monthlyBill" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average Monthly Hydro Bill</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select amount" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Under $100">Under $100</SelectItem>
                              <SelectItem value="$100 - $200">$100 - $200</SelectItem>
                              <SelectItem value="$200 - $400">$200 - $400</SelectItem>
                              <SelectItem value="$400+">$400+</SelectItem>
                              <SelectItem value="N/A (Off-Grid)">N/A (Off-Grid)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="timeline" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Timeline</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Immediately">Immediately</SelectItem>
                              <SelectItem value="1-3 months">1-3 months</SelectItem>
                              <SelectItem value="3-6 months">3-6 months</SelectItem>
                              <SelectItem value="6+ months">6+ months</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any specific requirements or questions?" className="min-h-[100px]" {...field} value={field.value || ""} />
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
                    className="w-full font-bold rounded"
                    disabled={
                      createEstimate.isPending ||
                      !TURNSTILE_CONFIGURED ||
                      !captchaToken
                    }
                  >
                    {createEstimate.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}