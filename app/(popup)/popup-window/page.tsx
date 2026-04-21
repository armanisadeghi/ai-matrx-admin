import type { Metadata } from "next";
import PopupWindowClient from "./_client";

export const metadata: Metadata = {
  title: "Popup Window",
  robots: { index: false, follow: false },
};

export default function PopupWindowPage() {
  return <PopupWindowClient />;
}
