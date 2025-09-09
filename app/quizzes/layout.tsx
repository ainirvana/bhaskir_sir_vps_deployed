import React from 'react';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiz Library - EduPlatform",
  description: "Access your AI-generated quizzes from selected articles. Review, retake, and download quizzes for offline study.",
};

export default function QuizzesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {children}
      </div>
    </div>
  );
}
