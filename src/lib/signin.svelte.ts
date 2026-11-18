// One sign-in dialog for the whole site; anything that needs you signed in just opens it.
export const signin = $state({ open: false });
export const openSignIn = () => (signin.open = true);
