import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume — Akhil Saxena",
  description: "Senior Software Engineer. Experience at Brevo, PharmEasy, MAQ Software. Projects, skills, and resume.",
  alternates: {
    canonical: "https://akhilsaxena.pages.dev/resume",
  },
};

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
