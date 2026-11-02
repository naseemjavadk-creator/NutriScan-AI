import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-16">
      <h1 className="text-3xl font-bold md:text-4xl">Create your account</h1>
      <p className="mb-6 mt-2 text-muted">Save meals, track your week and set your own goals.</p>
      <Suspense fallback={null}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
