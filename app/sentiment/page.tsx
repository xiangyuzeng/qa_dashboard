/** Negative Media & Sentiment (Module 5) — metadata + link only (never rehost article bodies).
 * Static: data read at build time; the `q` deep-link is read client-side (Suspense). */
import { Suspense } from "react";
import { getSentiment } from "@/src/lib/data";
import { sentimentByCategory } from "@/src/lib/aggregate";
import { SentimentClient } from "@/src/components/sentiment/SentimentClient";

export default function SentimentPage() {
  const data = getSentiment();
  return (
    <Suspense>
      <SentimentClient data={data} byCategory={sentimentByCategory(data)} />
    </Suspense>
  );
}
