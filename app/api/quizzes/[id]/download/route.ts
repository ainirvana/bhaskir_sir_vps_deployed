import { NextRequest, NextResponse } from 'next/server';
import { getQuizById } from '@/app/actions/content-management';
import jsPDF from 'jspdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    const result = await getQuizById(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Quiz not found' },
        { status: 404 }
      );
    }

    const quiz = result.data;
    const pdfBuffer = generateQuizPDF(quiz);
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateQuizPDF(quiz: any): Buffer {
  const doc = new jsPDF();
  const questions = quiz.quiz_data?.questions || [];
  
  // Header
  doc.setFontSize(20);
  doc.text(quiz.title, 20, 30);
  
  doc.setFontSize(12);
  if (quiz.description) {
    doc.text(quiz.description, 20, 45);
  }
  doc.text(`Total Questions: ${questions.length}`, 20, quiz.description ? 55 : 45);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, quiz.description ? 65 : 55);
  
  let yPos = quiz.description ? 85 : 75;
  
  // Questions (without highlighting correct answers)
  questions.forEach((question: any, index: number) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 30;
    }
    
    // Question number and text
    doc.setFontSize(14);
    doc.text(`Question ${index + 1}`, 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    const questionLines = doc.splitTextToSize(question.question || 'No question text', 170);
    doc.text(questionLines, 20, yPos);
    yPos += questionLines.length * 7 + 5;
    
    // Options
    const options = question.options || question.answers || [];
    options.forEach((option: string, optionIndex: number) => {
      const optionText = `${String.fromCharCode(65 + optionIndex)}. ${option}`;
      const optionLines = doc.splitTextToSize(optionText, 160);
      doc.text(optionLines, 30, yPos);
      yPos += optionLines.length * 7;
    });
    
    yPos += 10;
  });
  
  // Answer Key on new page
  doc.addPage();
  yPos = 30;
  
  doc.setFontSize(18);
  doc.text('Answer Key', 20, yPos);
  yPos += 20;
  
  questions.forEach((question: any, index: number) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 30;
    }
    
    const correctIndex = question.correctAnswer ?? question.correctAnswerIndex ?? 0;
    const correctLetter = String.fromCharCode(65 + correctIndex);
    
    doc.setFontSize(12);
    doc.text(`Question ${index + 1}: ${correctLetter}`, 20, yPos);
    yPos += 10;
    
    if (question.explanation) {
      doc.setFontSize(10);
      const explanationLines = doc.splitTextToSize(`Explanation: ${question.explanation}`, 170);
      doc.text(explanationLines, 30, yPos);
      yPos += explanationLines.length * 5 + 5;
    }
    
    yPos += 5;
  });
  
  return Buffer.from(doc.output('arraybuffer'));
}