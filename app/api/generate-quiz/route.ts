import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateQuizQuestionsFromArticle } from '@/lib/gemini-quiz-service';
import { v4 as uuidv4 } from 'uuid';

// Fallback function that creates simple questions based on article titles
function generateFallbackQuestions(articleTitles: string[]) {
  const fallbackQuestions = [];
  
  for (const title of articleTitles) {
    // Create a simple "Which article discusses..." question
    fallbackQuestions.push({
      question: `Which article discusses the topic of ${title.split(' ').slice(0, 3).join(' ')}...?`,
      options: [
        title,
        `Understanding ${title.split(' ').slice(-2).join(' ')}`,
        `The History of ${title.split(' ').slice(0, 1).join(' ')}`,
        `Analyzing ${title.split(' ').slice(-1).join(' ')} Trends`
      ],
      correctAnswerIndex: 0,
      explanation: `The article titled "${title}" is the one that directly discusses this topic.`
    });
  }
  
  return fallbackQuestions;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Extract request parameters
    const { title, articleIds, questionsPerArticle = 3 } = data;
    
    if (!title || !articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: title and articleIds' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabaseServer = createServerClient();
    
    // Fetch the articles
    const allQuestions = [];
    const quizArticleTitles = [];
    
    for (const articleId of articleIds) {
      try {
        console.log(`Fetching article with ID: ${articleId}`);
        
        let article = null;
        
        // Try fetching from gk_today_content table first
        try {
          const { data: gkArticle, error: gkError } = await supabaseServer
            .from('gk_today_content')
            .select('*')
            .eq('id', articleId)
            .single();
            
          if (!gkError && gkArticle) {
            article = gkArticle;
            console.log(`Found article in gk_today_content: ${article.title}`);
          }
        } catch (gkFetchError) {
          console.log(`Error fetching from gk_today_content:`, gkFetchError);
        }
        
        // If not found, try the articles table
        if (!article) {
          console.log(`Article not found in gk_today_content, trying articles table`);
          try {
            const { data: altArticle, error: altError } = await supabaseServer
              .from('articles')
              .select('*')
              .eq('id', articleId)
              .single();
              
            if (!altError && altArticle) {
              article = altArticle;
              console.log(`Found article in articles table: ${article.title}`);
            }
          } catch (altFetchError) {
            console.log(`Error fetching from articles table:`, altFetchError);
          }
        }
        
        if (!article) {
          console.error(`No article found with ID ${articleId} in either table`);
          continue;
        }
        
        console.log(`Successfully fetched article: ${article.title}`);
        
        if (!article) {
          console.error(`No article found with ID ${articleId}`);
          continue;
        }
        
        quizArticleTitles.push(article.title);
        
        // Prepare content for AI processing
        let fullContent = `Title: ${article.title}\n\n`;
        
        if (article.intro) {
          fullContent += `Introduction: ${article.intro}\n\n`;
        }
          // Add sections if available
        if (article.sections && Array.isArray(article.sections)) {
          article.sections.forEach((section: any, index: number) => {
            if (typeof section === 'object' && section !== null) {
              if (section.title) {
                fullContent += `Section ${index + 1}: ${section.title}\n`;
              }
              if (section.content) {
                fullContent += `${section.content}\n\n`;
              }
              // Add bullets if available
              if (section.bullets && Array.isArray(section.bullets)) {
                section.bullets.forEach((bullet: string, bIndex: number) => {
                  fullContent += `- ${bullet}\n`;
                });
                fullContent += '\n';
              }
            }
          });
        } else if (article.content) {
          // Use plain content if no sections
          fullContent += article.content;
        }
          // Generate questions for this article
        console.log(`Generating questions for article: ${article.title}`);
        console.log(`Content length: ${fullContent.length} characters`);
        
        // Handle potential empty content
        if (!fullContent || fullContent.length < 50) {
          console.warn(`Article content for ${articleId} is too short: ${fullContent.length} chars`);
          continue;
        }
        
        // If the content is too long, trim it
        const maxContentLength = 12000; // Gemini has token limits
        let processedContent = fullContent;
        if (fullContent.length > maxContentLength) {
          processedContent = fullContent.substring(0, maxContentLength) + "...";
          console.log(`Trimmed article content from ${fullContent.length} to ${maxContentLength} chars`);
        }
        
        // Try to generate questions with retry logic
        let questions = null;
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts && (!questions || questions.length === 0)) {
          attempts++;
          try {
            console.log(`Generating questions for article: ${article.title} (attempt ${attempts})`);
            questions = await generateQuizQuestionsFromArticle(processedContent, questionsPerArticle);
            
            if (questions && questions.length > 0) {
              console.log(`Successfully generated ${questions.length} questions for article ${article.title}`);
              allQuestions.push(...questions);
              break;
            } else {
              console.warn(`No questions generated for ${article.title} on attempt ${attempts}`);
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              }
            }
          } catch (questionError) {
            console.error(`Error generating questions for ${article.title} on attempt ${attempts}:`, questionError);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
          }
        }
        
        if (!questions || questions.length === 0) {
          console.warn(`Failed to generate questions for article ${article.title} after ${maxAttempts} attempts`);
        }
      } catch (error) {
        console.error(`Error processing article ${articleId}:`, error);
        continue;
      }
    }
      // If we couldn't generate any questions, try to use fallback questions or return an error
    if (allQuestions.length === 0) {
      // Try to generate fallback basic questions if possible
      if (quizArticleTitles.length > 0) {
        try {
          console.log("Attempting to generate fallback questions");
          const fallbackQuestions = generateFallbackQuestions(quizArticleTitles);
          if (fallbackQuestions.length > 0) {
            console.log(`Generated ${fallbackQuestions.length} fallback questions`);
            allQuestions.push(...fallbackQuestions);
          }
        } catch (fallbackError) {
          console.error("Failed to generate fallback questions:", fallbackError);
        }
      }
      
      // If still no questions, return error
      if (allQuestions.length === 0) {
        return NextResponse.json(
          { error: 'Failed to generate any quiz questions from the selected articles. Please try again with different articles or content.' },
          { status: 500 }
        );
      }
    }
    
    // Create quiz object in react-quiz-component format
    const quizId = uuidv4();
    const quiz = {
      id: quizId,
      quizTitle: title,
      quizSynopsis: `This quiz contains ${allQuestions.length} questions based on ${quizArticleTitles.length} article${quizArticleTitles.length !== 1 ? 's' : ''}.`,
      nrOfQuestions: allQuestions.length.toString(),
      questions: allQuestions.map((q, index) => ({
        question: q.question,
        questionType: "text",
        answerSelectionType: "single",
        answers: q.options,
        correctAnswer: q.correctAnswerIndex, // Use 0-based index as number
        messageForCorrectAnswer: "Correct answer. Good job.",
        messageForIncorrectAnswer: "Incorrect answer. Please try again.",
        explanation: q.explanation || "No explanation provided.",
        point: 10
      })),
      articleIds,
      articleTitles: quizArticleTitles,
      createdAt: new Date().toISOString(),
      totalQuestions: allQuestions.length,
      appLocale: {
        landingHeaderText: `${allQuestions.length} Questions`,
        question: "Question",
        startQuizBtn: "Start Quiz",
        resultFilterAll: "All",
        resultFilterCorrect: "Correct",
        resultFilterIncorrect: "Incorrect",
        prevQuestionBtn: "Prev",
        nextQuestionBtn: "Next",
        resultPageHeaderText: "You have completed the quiz. You got <correctIndexLength> out of <questionLength> questions."
      }
    };
    
    // Save quiz to database
    try {
      const { data: savedQuiz, error: saveError } = await supabaseServer
        .from('quizzes')
        .insert({
          id: quizId,
          title: quiz.quizTitle,
          description: quiz.quizSynopsis,
          quiz_data: quiz,
          questions: quiz.questions,
          article_ids: articleIds,
          is_published: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving quiz to database:', saveError);
        // Still return the quiz data even if save fails
        return NextResponse.json(quiz);
      }

      console.log('Quiz saved successfully to database');
      return NextResponse.json(quiz);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Still return the quiz data even if save fails
      return NextResponse.json(quiz);
    }
    
  } catch (error) {
    console.error('Error generating quiz:', error);
    
    // Check if this is a structured error from our AI service
    if (error instanceof Error && error.message.startsWith('{')) {
      try {
        const errorData = JSON.parse(error.message);
        return NextResponse.json({
          error: errorData.message,
          type: errorData.type,
          retryAfter: errorData.retryAfter,
          canRetry: errorData.canRetry
        }, { 
          status: errorData.type === 'RATE_LIMITED' ? 429 : 503,
          headers: {
            'Retry-After': errorData.retryAfter.toString()
          }
        });
      } catch (parseError) {
        // Fall through to generic error handling
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        type: 'GENERIC_ERROR',
        canRetry: true,
        retryAfter: 60
      },
      { status: 500 }
    );
  }
}
