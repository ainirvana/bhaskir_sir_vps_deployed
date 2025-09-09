'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  Search, 
  Users, 
  BarChart3,
  CheckCircle,
  Play,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the target element
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'scroll';
  content: React.ReactNode;
}

interface OnboardingTourProps {
  tourId: string;
  steps: OnboardingStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({ tourId, steps, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { userProfile } = useAuth();

  // Check if tour was already completed
  useEffect(() => {
    const completedTours = JSON.parse(localStorage.getItem('completedTours') || '[]');
    if (completedTours.includes(tourId)) {
      setCompleted(true);
    }
  }, [tourId]);

  // Start tour
  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);

  // Next step
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  }, [currentStep, steps.length]);

  // Previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Complete tour
  const completeTour = useCallback(() => {
    setIsActive(false);
    setCompleted(true);
    
    // Save completion to localStorage
    const completedTours = JSON.parse(localStorage.getItem('completedTours') || '[]');
    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId);
      localStorage.setItem('completedTours', JSON.stringify(completedTours));
    }
    
    onComplete?.();
  }, [tourId, onComplete]);

  // Skip tour
  const skipTour = useCallback(() => {
    setIsActive(false);
    completeTour();
    onSkip?.();
  }, [completeTour, onSkip]);

  // Get target element position
  const getTargetPosition = useCallback((target: string) => {
    const element = document.querySelector(target);
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }, []);

  if (!isActive || completed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        {!completed && (
          <Button
            onClick={startTour}
            className="shadow-lg"
            size="sm"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Start Tour
          </Button>
        )}
      </div>
    );
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Spotlight for target element */}
      {step.target && (
        <div 
          className="fixed bg-transparent border-4 border-blue-500 rounded-lg z-50 pointer-events-none"
          style={{
            ...getTargetPosition(step.target),
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        />
      )}

      {/* Tour Card */}
      <Card className="fixed z-50 w-96 shadow-2xl" style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        
        <CardContent className="space-y-4">
          <CardDescription>{step.description}</CardDescription>
          
          <div className="min-h-[100px]">
            {step.content}
          </div>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <Button onClick={nextStep}>
              {currentStep === steps.length - 1 ? (
                <>
                  Complete
                  <CheckCircle className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Predefined tours for different user roles
export const STUDENT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to EduPlatform!',
    description: 'Let\'s take a quick tour to get you started.',
    content: (
      <div className="text-center space-y-2">
        <BookOpen className="w-12 h-12 mx-auto text-blue-500" />
        <p>We'll show you the key features to help you succeed in your studies.</p>
      </div>
    )
  },
  {
    id: 'search',
    title: 'Global Search',
    description: 'Find articles, quizzes, and content quickly.',
    target: '[data-search-trigger]',
    content: (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Press Ctrl+K to search</span>
        </div>
        <p className="text-sm text-gray-600">
          Search across all content types including articles from GK Today, Drishti IAS, and more.
        </p>
      </div>
    )
  },
  {
    id: 'articles',
    title: 'Browse Articles',
    description: 'Access the latest current affairs and educational content.',
    target: '[data-articles-link]',
    content: (
      <div className="space-y-2">
        <p>Explore articles from top educational sources:</p>
        <ul className="text-sm space-y-1">
          <li>• GK Today - Current Affairs</li>
          <li>• Drishti IAS - UPSC Content</li>
          <li>• Daily Updates</li>
        </ul>
      </div>
    )
  },
  {
    id: 'quizzes',
    title: 'Take Quizzes',
    description: 'Test your knowledge with interactive quizzes.',
    target: '[data-quizzes-link]',
    content: (
      <div className="space-y-2">
        <BarChart3 className="w-8 h-8 text-green-500 mx-auto" />
        <p className="text-sm">Challenge yourself with quizzes and track your progress.</p>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start exploring and learning.',
    content: (
      <div className="text-center space-y-2">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
        <p>You're ready to begin your learning journey!</p>
        <p className="text-sm text-gray-600">
          Remember, you can always access the search with Ctrl+K.
        </p>
      </div>
    )
  }
];

export const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Admin Dashboard Tour',
    description: 'Learn how to manage your educational platform.',
    content: (
      <div className="text-center space-y-2">
        <Users className="w-12 h-12 mx-auto text-purple-500" />
        <p>Let's explore the admin features available to you.</p>
      </div>
    )
  },
  {
    id: 'students',
    title: 'Student Management',
    description: 'Add and manage student accounts.',
    target: '[data-students-link]',
    content: (
      <div className="space-y-2">
        <p>From here you can:</p>
        <ul className="text-sm space-y-1">
          <li>• Create student invitations</li>
          <li>• Manage student accounts</li>
          <li>• Reset passwords</li>
          <li>• View student activity</li>
        </ul>
      </div>
    )
  },
  {
    id: 'content',
    title: 'Content Management',
    description: 'Manage articles, quizzes, and slides.',
    target: '[data-content-link]',
    content: (
      <div className="space-y-2">
        <p>Content management features:</p>
        <ul className="text-sm space-y-1">
          <li>• Run content scrapers</li>
          <li>• Create and edit quizzes</li>
          <li>• Manage slide presentations</li>
          <li>• Monitor content quality</li>
        </ul>
      </div>
    )
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Monitor platform performance and user engagement.',
    target: '[data-dashboard-link]',
    content: (
      <div className="space-y-2">
        <BarChart3 className="w-8 h-8 text-blue-500 mx-auto" />
        <p className="text-sm">Track key metrics, user activity, and system health.</p>
      </div>
    )
  }
];

// Main onboarding wrapper component
export function UserOnboarding() {
  const { userProfile } = useAuth();
  
  if (!userProfile) return null;

  const isAdmin = userProfile.role === 'admin';
  const steps = isAdmin ? ADMIN_ONBOARDING_STEPS : STUDENT_ONBOARDING_STEPS;
  const tourId = isAdmin ? 'admin-onboarding' : 'student-onboarding';

  return (
    <OnboardingTour
      tourId={tourId}
      steps={steps}
      onComplete={() => {
        console.log('Onboarding completed for', userProfile.role);
      }}
      onSkip={() => {
        console.log('Onboarding skipped for', userProfile.role);
      }}
    />
  );
}
