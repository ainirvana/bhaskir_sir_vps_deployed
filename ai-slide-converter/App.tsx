
import React, { useState, useCallback } from 'react';
import { Slide } from './types';
import { generateSlidesFromContext } from './services/geminiService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SlideCard } from './components/SlideCard';
import { ArrowLeftIcon, ArrowRightIcon, LightBulbIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSlides = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to generate slides.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSlides([]);
    setCurrentSlideIndex(0);

    try {
      const generatedSlides = await generateSlidesFromContext(inputText);
      if (generatedSlides && generatedSlides.length > 0) {
        setSlides(generatedSlides);
      } else {
        setError('No slides were generated. The AI might not have found enough content or the format was unexpected.');
        setSlides([]);
      }
    } catch (err) {
      console.error('Error generating slides:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating slides. Check console for details.');
      setSlides([]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText]);

  const goToPreviousSlide = () => {
    setCurrentSlideIndex((prevIndex) => Math.max(0, prevIndex - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex((prevIndex) => Math.min(slides.length - 1, prevIndex + 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-100 flex flex-col items-center p-4 sm:p-8 selection:bg-sky-500 selection:text-white">
      <header className="w-full max-w-4xl mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <AcademicCapIcon className="h-12 w-12 text-sky-400 mr-3" />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400">
            AI Slide Converter
          </h1>
        </div>
        <p className="text-slate-400 text-lg">Transform your raw text into engaging presentation slides instantly.</p>
      </header>

      <main className="w-full max-w-4xl space-y-8">
        <section className="bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4 text-sky-300 flex items-center">
            <LightBulbIcon className="h-7 w-7 mr-2 text-yellow-400" />
            Input Your Content
          </h2>
          <textarea
            className="w-full h-60 p-4 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none placeholder-slate-500 transition-colors duration-150"
            placeholder="Paste your complete text context here. The more detailed your text, the better the slides..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          <button
            onClick={handleGenerateSlides}
            disabled={isLoading || !inputText.trim()}
            className="mt-6 w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="h-5 w-5 mr-2" />
                Generating Slides...
              </>
            ) : (
              'Generate Slides'
            )}
          </button>
          {error && <p className="mt-4 text-red-400 bg-red-900/30 p-3 rounded-md border border-red-700">{error}</p>}
        </section>

        {isLoading && (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-800 shadow-2xl rounded-xl border border-slate-700">
            <LoadingSpinner className="h-12 w-12 text-sky-400" />
            <p className="mt-4 text-lg text-slate-300">AI is crafting your slides... Please wait.</p>
          </div>
        )}

        {!isLoading && slides.length > 0 && (
          <section className="bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-6 text-sky-300 text-center">Generated Slides</h2>
            <div className="mb-6">
              <SlideCard slide={slides[currentSlideIndex]} slideNumber={currentSlideIndex + 1} totalSlides={slides.length} />
            </div>
            {slides.length > 1 && (
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={goToPreviousSlide}
                  disabled={currentSlideIndex === 0}
                  className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Previous
                </button>
                <span className="text-slate-400">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <button
                  onClick={goToNextSlide}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </button>
              </div>
            )}
          </section>
        )}
        
        {!isLoading && !error && slides.length === 0 && inputText && (
           <div className="text-center p-8 bg-slate-800 shadow-xl rounded-xl border border-slate-700">
             <p className="text-slate-400 text-lg">No slides generated yet, or the previous generation attempt was unsuccessful. Try providing more detailed content or rephrasing your input.</p>
           </div>
        )}

      </main>
      <footer className="w-full max-w-4xl mt-12 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} AI Slide Converter. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
