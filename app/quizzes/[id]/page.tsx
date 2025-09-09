"use client";

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import QuizViewer from '@/components/student/quiz-viewer';

interface QuizPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function QuizPage({ params }: QuizPageProps) {
  const { id } = use(params);

  if (!id) {
    return notFound();
  }

  return (
    <div className="container py-8">
      <QuizViewer quizId={id} />
    </div>
  );
}
