import { redirect } from "next/navigation";

/** /vault/authenticator — kept as a link; One-time passwords are a view of the Vault now. */
export default function AuthenticatorRoute() {
  redirect("/vault?view=authenticator");
}
