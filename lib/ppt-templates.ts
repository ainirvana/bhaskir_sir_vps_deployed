// lib/ppt-templates.ts

export interface PPTTemplate {
  id: string;
  name: string;
  description: string;
  masterSlide: string;
  thumbnail?: string;
}

/**
 * Defines a single block of content on a slide.
 * This allows for mixing different types of content (paragraphs, lists).
 */
export interface ContentBlock {
  type: 'paragraph' | 'bullet';
  text: string;
  level?: number; // For nested bullets
}

/**
 * Represents the content for a single, logical slide.
 * The dynamic layout engine may split this across multiple physical slides if it's too long.
 */
export interface LogicalSlide {
  title: string;
  blocks: ContentBlock[];
  // AI-extracted keywords that should be bolded
  keywords?: string[];
}

/**
 * Legacy interface for backward compatibility
 */
export interface SlideContent {
  title: string;
  content?: string; 
  image?: string;
  bulletPoints?: string[];
}

export interface PPTGenerationOptions {
  title: string;
  subtitle?: string;
  author?: string;
  template: PPTTemplate;
  slides: LogicalSlide[]; // We now use an array of LogicalSlide
}

// Available templates (no changes here)
export const PPT_TEMPLATES: PPTTemplate[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean and modern design with blue accent colors',
    masterSlide: 'MODERN',
    thumbnail: '/ppt-templates/modern.svg'
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Professional template for educational presentations',
    masterSlide: 'ACADEMIC',
    thumbnail: '/ppt-templates/academic.svg'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and minimalistic design',
    masterSlide: 'MINIMAL',
    thumbnail: '/ppt-templates/minimal.svg'
  },
];