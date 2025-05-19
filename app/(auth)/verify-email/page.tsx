"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import FormField from "@/components/FormField";
import { Suspense, useEffect, useState } from "react";
import { resendVerificationCode, verifyEmail } from "@/lib/actions/auth.action";

const formSchema = z.object({
  code: z.string().min(2).max(50),
});

const VerifyEmail = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
    },
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const email = searchParams.get("email");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(30); 

  useEffect(() => {
    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);


  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setStatus("loading");
    setErrorMessage("");
    const { code } = values;

    try {
      const result = await verifyEmail({ uid: uid!, code });
      if (result?.success) {
        setStatus("success");
        setTimeout(() => {
          router.push("/sign-in");
        }, 3000);
      } else {
        setStatus("error");
        setErrorMessage(
          result?.message || "An unexpected error occurred. Please try again."
        );
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setStatus("error");
      setErrorMessage("Invalid verification code. Please try again.");
    }
  }
  const handleResendCode = async () => {
    if (countdown > 0) return;

    setStatus("loading");
    try {
      // You'll need to implement this function in your auth.action.ts
      const result = await resendVerificationCode({
        uid: uid!,
        email: email!,
        verificationType: "signin",
      });
      
      if (result?.success) {
        setCountdown(30); // Reset countdown to 5 minutes
        setErrorMessage(""); // Clear any previous errors
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMessage(result?.message || "Failed to resend verification code");
      }
    } catch (error) {
      console.error("Error resending code:", error);
      setStatus("error");
      setErrorMessage("An error occurred while resending the code");
    }
  };

  if (!uid) {
    return <div className="p-6 max-w-md mx-auto mt-10">Loading...</div>;
  }

  return (
    <div className="w-full flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Verify your email</h1>
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}
      {status === "success" ? (
        <div className="mb-4 p-4 bg-green-100 rounded-md">
          <p className="text-green-700">Email verified successfully!</p>
          <Link href="/login" className="text-blue-500 hover:underline">
            You can login now
          </Link>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errorMessage}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="code"
                label="Enter the code sent to your email"
                placeholder="Your code"
              />
              <Button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Verifying..." : "Verify Email"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Code expires in: {formatTime(countdown)}
            </p>
            
            <button
              onClick={handleResendCode}
              disabled={countdown > 0 || status === "loading"}
              className={`mt-2 text-sm ${
                countdown > 0 ? "text-gray-400" : "text-blue-500 hover:underline"
              }`}
            >
              {countdown > 0 ? "Resend code not available yet" : "Resend code"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading verification...</div>}>
      <VerifyEmail />
    </Suspense>
  );
}
