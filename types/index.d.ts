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

