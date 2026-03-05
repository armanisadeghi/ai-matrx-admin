import { redirect } from "next/navigation";

export default function SSRPage() {
    redirect("/ssr/dashboard");
}
