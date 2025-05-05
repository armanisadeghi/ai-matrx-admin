import { cookies } from "next/headers";
import ClientTopMenu from "./ClientTopMenu";



export default async function PublicTopMenu() {
    const cookieStore = await cookies(); // Await cookies() to get the cookie store
    const theme = (cookieStore.get("theme")?.value as "light" | "dark") || "dark";

    return <ClientTopMenu initialTheme={theme} />;
}
