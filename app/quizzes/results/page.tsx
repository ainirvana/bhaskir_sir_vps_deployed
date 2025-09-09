"use client";

import React from 'react';
import QuizResultsList from '@/components/student/quiz-results-list';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QuizResultsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quiz Results</h1>
        <Button variant="outline" asChild>
          <Link href="/quizzes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>
      </div>
      
      <QuizResultsList />
    </div>
  );
}
