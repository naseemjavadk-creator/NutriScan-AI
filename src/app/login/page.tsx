import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <h1 className="text-3xl font-bold md:text-4xl">Welcome back</h1>
      <p className="mb-6 mt-2 text-muted">Log in to see your food diary.</p>
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
