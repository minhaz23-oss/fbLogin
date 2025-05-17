"use server";

import { auth,db } from "@/firebase/admin";
import { cookies } from "next/headers";

const ONE_WEEK = 60 * 60 * 24 * 7 * 1000;

export async function signUp(params: SignUpParams) {
  const { uid, email, name } = params;

  try {
      const userRecord = await db.collection("users").doc(uid).get();
    if(userRecord.exists)  return {
        success: false,
        message: "User already exists. Please sign in.",
      };
    await db.collection('users').doc(uid).set({
        name,email
    })

    return {
        success: true,
        message: 'user created successfully'
    }

  }catch (error: unknown) {
    // Type guard for error to check if it's a FirebaseError
    const firebaseError = error as FirebaseError;
    console.log("error creating user ", firebaseError);
    
    if (firebaseError.code === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }
    
    return {
      success: false,
      message: 'error while creating a user'
    };
  }
}

export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: ONE_WEEK,
  });

  cookieStore.set("session", sessionCookie, {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signIn(params: SignInParams) {
   const {email,idToken} = params;
   try {
    const userRecord = await auth.getUserByEmail(email);
    if(!userRecord) return {
      success: false,
      message: 'user does not exist, please create and account'
    }
    await setSessionCookie(idToken)
   } catch (error) {
    console.log(error);
    return {
      success: false,
      message: 'error while signing in'
    }
   }
}

export async function signInWithGoogle(params: SignInWithGoogle) {
    const {uid,name,email,idToken} = params;
    try {
      const userRecord = await db.collection('users').doc(uid).get();

      if(!userRecord.exists) {
        await db.collection('users').doc(uid).set({
          name,
          email,
          provider: 'google'
        })
      }

      await setSessionCookie(idToken);

      return {
        success: true,
        message: 'successful'
      }
    } catch (error) {
      console.log(error)
      return {
        success: false,
        message: 'error while loggin in with google'
      }
    }
}

export async function signInWithFacebook(params: SignInWithFacebook) {
  const { uid, name, email, idToken } = params;
  
  try {
    // Check if user exists in your database
    const userRecord = await db.collection("users").doc(uid).get();
    
    // If user doesn't exist, create a new user record
    if (!userRecord.exists) {
      await db.collection('users').doc(uid).set({
        name,
        email,
        provider: 'facebook'
      });
    }
    
    // Set the session cookie
    await setSessionCookie(idToken);
    
    return {
      success: true,
      message: 'Facebook sign-in successful'
    };
  } catch (error) {
    console.log("Facebook sign-in error:", error);
    return {
      success: false,
      message: 'Error during Facebook sign-in'
    };
  }
}