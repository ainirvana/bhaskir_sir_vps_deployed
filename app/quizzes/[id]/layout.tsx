import React from 'react';
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  // If you were using a database, you could fetch the quiz title here
  // For now, we'll use a generic title
  return {
    title: `Quiz #${id.substring(0, 8)} - EduPlatform`,
    description: "Take an interactive quiz created from educational articles.",
  }
}

export default function QuizDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
