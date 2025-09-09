
import React from 'react';
import { Slide } from '../types';
import { PresentationChartLineIcon } from '@heroicons/react/24/outline';

interface SlideCardProps {
  slide: Slide;
  slideNumber: number;
  totalSlides: number;
}

export const SlideCard: React.FC<SlideCardProps> = ({ slide, slideNumber, totalSlides }) => {
  if (!slide) {
    return (
        <div className="bg-slate-700 p-6 rounded-lg shadow-lg border border-slate-600 min-h-[300px] flex flex-col justify-center items-center">
            <p className="text-slate-400">Slide data is unavailable.</p>
        </div>
    );
  }
  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-750 p-6 sm:p-8 rounded-xl shadow-xl border border-slate-600 min-h-[350px] flex flex-col transition-all duration-300 ease-in-out transform hover:scale-[1.01]">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-600">
        <h3 className="text-2xl sm:text-3xl font-bold text-sky-300 flex items-center">
            <PresentationChartLineIcon className="h-7 w-7 mr-3 text-sky-400" />
            {slide.title || `Slide ${slideNumber}`}
        </h3>
        {totalSlides > 0 && (
            <span className="text-sm text-slate-400 bg-slate-600 px-3 py-1 rounded-full">
                {slideNumber} / {totalSlides}
            </span>
        )}
      </div>
      
      <ul className="space-y-3 sm:space-y-4 list-none pl-0 text-slate-200 flex-grow">
        {slide.content && slide.content.length > 0 ? (
          slide.content.map((point, index) => (
            <li key={index} className="flex items-start">
              <svg className="h-5 w-5 text-cyan-400 mr-3 mt-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-base sm:text-lg leading-relaxed">{point}</span>
            </li>
          ))
        ) : (
          <li className="text-slate-400 italic">No content points for this slide.</li>
        )}
      </ul>
    </div>
  );
};
