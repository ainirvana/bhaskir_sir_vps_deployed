import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  articleIds: string[];
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const quiz: Quiz = await request.json();
    
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid quiz data' },
        { status: 400 }
      );
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    yPosition = addWrappedText(quiz.title, margin, yPosition, pageWidth - 2 * margin, 20);
    yPosition += 10;

    // Quiz info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(`Total Questions: ${quiz.questions.length}`, margin, yPosition, pageWidth - 2 * margin);
    yPosition = addWrappedText(`Created: ${new Date(quiz.createdAt).toLocaleDateString()}`, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 15;

    // Questions section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    yPosition = addWrappedText('QUESTIONS', margin, yPosition, pageWidth - 2 * margin, 16);
    yPosition += 10;

    quiz.questions.forEach((question, index) => {
      checkNewPage(80); // Estimate space needed for question

      // Question number and text
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      yPosition = addWrappedText(`${index + 1}. ${question.question}`, margin, yPosition, pageWidth - 2 * margin, 14);
      yPosition += 5;

      // Options
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      (question.options || []).forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        const isCorrect = question.correctAnswerIndex === optionIndex;
        
        if (isCorrect) {
          doc.setFont('helvetica', 'bold');
        }
        
        yPosition = addWrappedText(`   ${optionLetter}) ${option}`, margin, yPosition, pageWidth - 2 * margin);
        
        if (isCorrect) {
          doc.setFont('helvetica', 'normal');
        }
      });
      yPosition += 10;
    });

    // Answer Key section
    checkNewPage(100);
    yPosition += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    yPosition = addWrappedText('ANSWER KEY', margin, yPosition, pageWidth - 2 * margin, 16);
    yPosition += 10;

    quiz.questions.forEach((question, index) => {
      checkNewPage(40);

      const correctOption = String.fromCharCode(65 + (question.correctAnswerIndex || 0));
      const correctAnswer = (question.options || [])[question.correctAnswerIndex || 0] || 'No answer';

      // Question number and correct answer
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      yPosition = addWrappedText(`${index + 1}. Correct Answer: ${correctOption}) ${correctAnswer}`, margin, yPosition, pageWidth - 2 * margin);
      
      // Explanation
      if (question.explanation) {
        doc.setFont('helvetica', 'normal');
        yPosition = addWrappedText(`   Explanation: ${question.explanation}`, margin, yPosition, pageWidth - 2 * margin);
      }
      yPosition += 8;
    });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(quiz.title || 'quiz').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}