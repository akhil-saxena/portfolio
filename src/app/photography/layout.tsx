import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photography — Akhil Saxena",
  description: "Portfolio of photography across architecture, nature, street, wildlife, and more.",
  alternates: {
    canonical: "https://akhilsaxena.pages.dev/photography",
  },
};

export default function PhotographyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
