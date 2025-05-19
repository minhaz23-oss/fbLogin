"use server";

import { auth, db } from "@/firebase/admin";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { Resend } from "resend";


const ONE_WEEK = 60 * 60 * 24 * 7 * 1000;
const VERIFICATION_CODE_EXPIRY = 60 * 30; // 30 minutes in seconds
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a random verification code
function generateVerificationCode(length = 6) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

async function sendVerificationEmail(email: string, code: string) {
  try {
    // Initialize Resend (assuming you've already imported it)
    // const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'Verification <onboarding@resend.dev>', // Use Resend's default domain during development
      to: [email],
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Your Verification Code</h2>
          <p>Use the following code to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
            ${code}
          </div>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }
    
    console.log('Email sent successfully, ID:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}



export async function resendVerificationCode(params: {
  uid: string;
  email: string;
  verificationType: 'signin' | 'signup';
}) {
  const { uid, email, verificationType } = params;
  
  try {
    // Determine which collection to use based on verification type
    const collectionName = verificationType === 'signin' 
      ? 'signin_verifications' 
      : 'pending_verifications';
    
    // Check if there's an existing verification record
    const verificationDoc = await db
      .collection(collectionName)
      .doc(uid)
      .get();
      
    if (!verificationDoc.exists) {
      return {
        success: false,
        message: "Verification request not found",
      };
    }
    
    // Generate a new verification code
    const verificationCode = generateVerificationCode();
    const codeExpiry = Math.floor(Date.now() / 1000) + VERIFICATION_CODE_EXPIRY;
    
    // Update fields based on verification type
    const updateData: Record<string, string | number> = {
      verificationCode,
      verificationCodeExpiry: codeExpiry,
    };
    
    // For signup verification, we might need to update additional fields
    if (verificationType === 'signup') {
      updateData.emailSentAt = Math.floor(Date.now() / 1000);
    }
    
    // Update the verification record with the new code
    await db.collection(collectionName).doc(uid).update(updateData);
    
    // Send the appropriate verification email
    let emailSent;
    if (verificationType === 'signin') {
      emailSent = await sendVerificationEmail(email, verificationCode);
    } else {
      emailSent = await sendVerificationEmail(email, verificationCode);
    }
    
    if (!emailSent) {
      return {
        success: false,
        message: "Failed to send verification email. Please try again.",
      };
    }
    
    return {
      success: true,
      message: "Verification code resent to your email.",
      // Return code only in development
      verificationCode:
        process.env.NODE_ENV === "development" ? verificationCode : undefined,
    };
  } catch (error) {
    console.log(`Error resending ${verificationType} verification code:`, error);
    return {
      success: false,
      message: "Error while resending verification code",
    };
  }
}

export async function signUp(params: SignUpParams) {
  const { uid, email, name } = params;

  try {
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };
    const pendingRecord = await db
      .collection("pending_verifications")
      .doc(uid)
      .get();

    if (pendingRecord.exists) {
      return {
        success: false,
        message:
          "Verification request already exists. Please check your email for the verification code.",
      };
    }

    const verificationCode = generateVerificationCode();
    const codeExpiry = Math.floor(Date.now() / 1000) + VERIFICATION_CODE_EXPIRY;

    await db
      .collection("pending_verifications")
      .doc(uid)
      .set({
        name,
        email,
        verificationCode,
        verificationCodeExpiry: codeExpiry,
        createdAt: Math.floor(Date.now() / 1000),
      });
    const emailSent = await sendVerificationEmail(email, verificationCode);
    if (!emailSent) {
      return {
        success: false,
        message: "Failed to send verification email. Please try again.",
      };
    }
    return {
      success: true,
      message: "Verification code sent to your email.",
      uid,
      // Return code only in development
      verificationCode:
        process.env.NODE_ENV === "development" ? verificationCode : undefined,
    };
  } catch (error: unknown) {
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
      message: "error while creating a user",
    };
  }
}

export async function verifyEmail(params: VerifyEmailParams) {
  const { uid, code } = params;

  try {
    // Get pending verification
    const pendingDoc = await db
      .collection("pending_verifications")
      .doc(uid)
      .get();
    if (!pendingDoc.exists) {
      return {
        success: false,
        message: "Verification request not found or already verified",
      };
    }

    const pendingData = pendingDoc.data();
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if code is valid and not expired
    if (
      pendingData?.verificationCode !== code ||
      !pendingData?.verificationCodeExpiry ||
      currentTime > pendingData.verificationCodeExpiry
    ) {
      return {
        success: false,
        message: "Invalid or expired verification code",
      };
    }

    // Create the actual user record now that email is verified
    await db.collection("users").doc(uid).set({
      name: pendingData.name,
      email: pendingData.email,
      emailVerified: true,
      createdAt: currentTime,
    });

    // Update the Firebase Auth user record
    await auth.updateUser(uid, { emailVerified: true });

    // Delete the pending verification
    await db.collection("pending_verifications").doc(uid).delete();

    return {
      success: true,
      message: "Email verified successfully",
    };
  } catch (error) {
    console.log("Error verifying email:", error);
    return {
      success: false,
      message: "Error while verifying email",
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
  const { email, idToken } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord)
      return {
        success: false,
        message: "User does not exist, please create an account",
      };

    // Check if user exists in the users collection (verified)
    const userDoc = await db.collection("users").doc(userRecord.uid).get();

    if (!userDoc.exists) {
      // Check if there's a pending verification
      const pendingDoc = await db
        .collection("pending_verifications")
        .doc(userRecord.uid)
        .get();

      if (pendingDoc.exists) {
        // User needs to verify their email
        return {
          success: false,
          message: "Please verify your email before signing in",
          requiresVerification: true,
          uid: userRecord.uid,
        };
      } else {
        // Strange case: Auth user exists but not in our DB collections
        return {
          success: false,
          message: "Account issue. Please try signing up again.",
        };
      }
    }

    const verificationCode = generateVerificationCode();
    const expiryTime = Math.floor(Date.now() / 1000) + 15 * 60;
    
    await db.collection("signin_verifications").doc(userRecord.uid).set({
      verificationCode,
      email,
      idToken,
      createdAt: Math.floor(Date.now() / 1000),
      verificationCodeExpiry: expiryTime
    });
    const emailSent = await sendVerificationEmail(email, verificationCode);
    if (!emailSent) {
      return {
        success: false,
        message: "Failed to send verification email. Please try again.",
      };
    }

    return {
      success: true,
      message: "Verification code sent to your email.",
      uid: userRecord.uid,
      email,
      requiresVerification: true,
      // Return code only in development
      verificationCode:
        process.env.NODE_ENV === "development" ? verificationCode : undefined,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error while signing in",
    };
  }
}

export async function verifySignIn(params: VerifySignInParams) {
  const { uid, code } = params;

  try {
    // Get sign-in verification record
    const verificationDoc = await db
      .collection("signin_verifications")
      .doc(uid)
      .get();
      
    if (!verificationDoc.exists) {
      return {
        success: false,
        message: "Verification request not found or expired",
      };
    }

    const verificationData = verificationDoc.data();
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if code is valid and not expired
    if (
      verificationData?.verificationCode !== code ||
      !verificationData?.verificationCodeExpiry ||
      currentTime > verificationData.verificationCodeExpiry
    ) {
      return {
        success: false,
        message: "Invalid or expired verification code",
      };
    }

    // Code is valid, set the session cookie using the stored idToken
    await setSessionCookie(verificationData.idToken);

    // Delete the verification record after successful verification
    await db.collection("signin_verifications").doc(uid).delete();

    return {
      success: true,
      message: "Sign in successful",
    };
  } catch (error) {
    console.log("Error verifying sign-in:", error);
    return {
      success: false,
      message: "Error while verifying sign-in",
    };
  }
}

export async function signInWithGoogle(params: SignInWithGoogle) {
  const { uid, name, email, idToken } = params;
  try {
    const userRecord = await db.collection("users").doc(uid).get();

    if (!userRecord.exists) {
      await db.collection("users").doc(uid).set({
        name,
        email,
        provider: "google",
      });
    }

    await setSessionCookie(idToken);

    return {
      success: true,
      message: "successful",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "error while loggin in with google",
    };
  }
}

export async function signInWithFacebook(params: SignInWithFacebook) {
  const { uid, name, email, idToken } = params;

  try {
    // Check if user exists in your database
    const userRecord = await db.collection("users").doc(uid).get();

    // If user doesn't exist, create a new user record
    if (!userRecord.exists) {
      await db.collection("users").doc(uid).set({
        name,
        email,
        provider: "facebook",
      });
    }

    // Set the session cookie
    await setSessionCookie(idToken);

    return {
      success: true,
      message: "Facebook sign-in successful",
    };
  } catch (error) {
    console.log("Facebook sign-in error:", error);
    return {
      success: false,
      message: "Error during Facebook sign-in",
    };
  }
}
