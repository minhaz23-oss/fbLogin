interface SignUpParams {
    uid: string,
    name: string,
    email: string,
    password: string
}

interface SignInParams {
    email: string,
    idToken: string
}

interface SignInWithGoogle {
    uid: string,
    name: string,
    idToken: string,
    email: string
}

interface SignInWithFacebook {
    uid: string,
    name: string,
    idToken: string,
    email: string
}
interface AuthFormProps {
    type: AuthFormType;
  }

interface FirebaseError extends Error {
    code?: string;
    message: string;
  }

  interface VerifyEmailParams {
    uid: string;
    code: string;
  }
  interface VerifySignInParams {
    uid: string;
    code: string;
  }