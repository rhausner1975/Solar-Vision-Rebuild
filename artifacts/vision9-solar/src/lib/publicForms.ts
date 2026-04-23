import type {
  ContactSubmissionInput,
  EstimateRequestInput,
  SubmissionAck,
} from "@workspace/api-client-react";

interface AntiSpamFields {
  turnstileToken: string | null;
  website: string;
  formMountedAt: number;
}

export type ContactSubmissionPayload = ContactSubmissionInput & AntiSpamFields;
export type EstimateRequestPayload = EstimateRequestInput & AntiSpamFields;

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors; fall back to status code message
    }
    throw new Error(message);
  }
  return (await response.json()) as TResponse;
}

export function submitContactSubmission(
  payload: ContactSubmissionPayload,
): Promise<SubmissionAck> {
  return postJson<SubmissionAck>("/api/contact-submissions", payload);
}

export function submitEstimateRequest(
  payload: EstimateRequestPayload,
): Promise<SubmissionAck> {
  return postJson<SubmissionAck>("/api/estimate-requests", payload);
}
