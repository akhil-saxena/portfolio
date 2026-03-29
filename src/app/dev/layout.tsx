import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Development — Akhil Saxena",
  description: "Senior Software Engineer. Experience at Brevo, PharmEasy, MAQ Software. Projects, skills, and resume.",
  alternates: {
    canonical: "https://akhilsaxena.pages.dev/dev",
  },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return children;
}
