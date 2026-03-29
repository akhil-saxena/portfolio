import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio — Akhil Saxena",
  description: "Portfolio of photography across architecture, nature, street, wildlife, and more.",
  alternates: {
    canonical: "https://akhilsaxena.pages.dev/portfolio",
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
