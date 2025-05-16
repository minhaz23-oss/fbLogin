"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { auth } from "@/firebase/client";
import Link from "next/link";
import FormField from "./FormField";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { signIn, signInWithGoogle, signUp } from "@/lib/actions/auth.action";
import { useRouter } from "next/navigation";
import { useState } from "react";


type AuthFormType = "sign-in" | "sign-up";
const authFormSchema = (type: AuthFormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(4),
  });
};


const AuthForm = ({type}: AuthFormProps) => {
  const router = useRouter();
  const formSchema = authFormSchema(type);
  const [loading,setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (type === "sign-in") {
        const { email, password } = values;
        const userCredentials = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        const idToken = await userCredentials.user.getIdToken();

        if (!idToken) return;

        await signIn({
          email,
          idToken,
        });
        router.push("/");
      } else {
        const { name, email, password } = values;
        const userCredentials = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const result = await signUp({
          uid: userCredentials.user.uid,
          name: name!,
          email,
          password,
        });

        if (!result?.success) {
          console.log(result?.message);
          return;
        }
        router.push("/sign-in");
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleGoogleSignIn = async () => {
    
    try {
      setLoading(true)
      const provider = new GoogleAuthProvider();
      const userCredentials = await signInWithPopup(auth, provider);
      const idToken = await userCredentials.user.getIdToken();
      if (!idToken) {
        console.error("No ID token received from Google authentication");
        return {
          success: false,
          message: "Authentication failed. Please try again.",
        };
      }
      const {uid,displayName,email} = userCredentials.user;
      const result = await signInWithGoogle({
        uid,
        name: displayName || "",
        email: email || "",
        idToken
      })

       if (!result?.success) {
        console.log(result?.message);
        return;
      }
      
      
      router.push('/');
      setLoading(false)
    } catch (error) {
      console.log("Google sign-in error:", error);
    }
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="w-[400px] h-fit py-4 px-5 rounded-lg bg-black/90 text-white font-semibold ">
      {loading && (
  <div className=" w-[300px] h-[250px] bg-white rounded-md flex justify-center items-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
    <p className=" text-black font-bold text-[25px]">loading...</p>
  </div>
)}
      <h3 className=" text-center text-[28px]">Demo {type}</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full mt-4">
          {!isSignIn && (
            <FormField
              control={form.control}
              name="name"
              label="Name"
              placeholder="Your name"
            />
          )}

          <FormField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="Your email"
          />
          <FormField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            placeholder="Your password"
          />

          <Button
            className=" w-full mt-3 font-semibold bg-white text-black"
            type="submit"
          >
            {isSignIn ? "sign in" : "create an account"}
          </Button>
        </form>
      </Form>

      <div className="mt-4">
        <div className="relative flex items-center justify-center">
          <hr className="w-full border-t border-gray-300" />
          <span className="absolute bg-black px-2 text-sm text-gray-300">
            OR
          </span>
        </div>

        <Button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-white text-black font-semibold cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="20px"
            height="20px"
          >
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          Continue with Google
        </Button>
      </div>

      <div className="mt-2">
      <Button
          type="button"
          onClick={() => {}}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1877F2] text-white font-semibold cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20px"
            height="20px"
            viewBox="0 0 48 48"
          >
            <path
              fill="#fff"
              d="M25.638 48H2.65A2.65 2.65 0 0 1 0 45.35V2.65A2.649 2.649 0 0 1 2.65 0H45.35A2.649 2.649 0 0 1 48 2.65v42.7A2.65 2.65 0 0 1 45.35 48H33.119V29.412h6.24l.934-7.244h-7.174v-4.625c0-2.098.583-3.527 3.59-3.527l3.836-.002V7.535c-.663-.088-2.94-.285-5.59-.285-5.53 0-9.317 3.376-9.317 9.575v5.343h-6.255v7.244h6.255V48Z"
            />
          </svg>
          Continue with Facebook
        </Button>
       </div>

      <p className=" text-center mt-2">
        {isSignIn ? "Dont have an account?" : "already have an account?"}
        <Link
          className=" ml-2 font-normal"
          href={`${isSignIn ? "/sign-up" : "/sign-in"}`}
        >
          {isSignIn ? "sign-up" : "sign-in"}
        </Link>
      </p>
    </div>
  );
};

export default AuthForm;
