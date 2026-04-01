import { PaymentProof } from "@/lib/types";

export function getPaymentProofHref(proof?: PaymentProof) {
  return proof?.url || proof?.dataUrl || "";
}

export function isBlobPaymentProof(url: string) {
  return /^https:\/\/.+\.public\.blob\.vercel-storage\.com\//.test(url);
}
