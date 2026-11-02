import type { Metadata } from "next";
import ScanFlow from "@/components/ScanFlow";

export const metadata: Metadata = { title: "Scan a meal" };

export default function ScanPage() {
  return <ScanFlow />;
}
