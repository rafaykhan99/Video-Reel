# Overview

Explainer AI Video Generator is an AI-powered application designed to create comprehensive explainer videos from user-provided topics. The system integrates advanced AI models to generate scripts, create visuals, synthesize narration, and compile professional-quality MP4 videos. Users specify a topic, desired duration (20 seconds to 3 minutes), voice style, and image style preferences. The platform also offers a "News" category for real-time current event video generation and comprehensive social media publishing capabilities, including direct YouTube Shorts uploads. The project aims to provide an accessible and efficient solution for on-demand video content creation, with a vision for broad market potential in content creation and marketing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript SPA**: Built with Vite, using `shadcn/ui` for components and TailwindCSS for styling.
- **Routing**: `Wouter` for client-side navigation.
- **State Management**: `TanStack Query` for server state and `React Hook Form` with Zod for form management.

## Backend Architecture
- **Express.js Server**: RESTful API with middleware for logging, error handling, and JSON parsing.
- **Monorepo Structure**: Shared TypeScript schema definitions between client and server.
- **Service Layer Pattern**: Separated services for OpenAI integration, text-to-speech, and video processing.
- **Async Processing**: Multi-step asynchronous workflows for video generation.

## Data Storage Solutions
- **PostgreSQL with Drizzle ORM**: Type-safe database operations, including session storage, user management, credit tracking, social media accounts, and music library.
- **Neon Database**: Serverless PostgreSQL for cloud deployment.
- **Schema-First Design**: Zod validation schemas shared across the stack.
- **File Storage**: Temporary handling for images, audio segments, and video assets.

## Authentication and Authorization
- **Google OAuth Integration**: User authentication via Replit Auth.
- **Session-Based Auth**: User sessions stored in PostgreSQL.
- **Route Protection**: Middleware for securing API endpoints.

## Video Generation Pipeline
1.  **Script Generation**: Enhanced AI (GPT-4o) creates engaging, hook-focused scripts that jump straight into content without introductions, supporting dual-language generation.
2.  **News Integration**: Real-time web search integration for current events with AI analysis to create compelling, fact-based news content.
3.  **Image Creation**: Dual-provider support (DALL-E 3 + Runware) with cost-efficient image generation.
4.  **Audio Synthesis**: OpenAI Text-to-Speech converts script text to high-quality narration.
5.  **Enhanced Video Processing (FFmpeg + Remotion Fallback)**:
    -   **Primary System**: Enhanced FFmpeg with improved text overlay timing
    -   **Precise Text Timing**: Text overlays synchronized exactly with script segment durations
    -   **Smooth Visual Effects**: Subtle zoom effects and fade transitions without shaking
    -   **Reliable Audio Processing**: Multi-step normalization and concatenation
    -   **Remotion Backup**: Available for environments with proper system dependencies
6.  **Advanced Visual Effects**:
    -   Professional React component-based rendering using Remotion
    -   Precise timing-based text overlays synchronized with narration segments
    -   Smooth fade transitions between image segments
    -   Enhanced audio quality (128kbps AAC) with consistent format processing
    -   Custom fonts and colors with proper shadow effects
7.  **Editing Workflow**: Complete script editing and selective image regeneration capabilities.

## UI/UX Decisions
-   Consistent design system using `shadcn/ui` and TailwindCSS.
-   Enhanced font and color selection for text overlays.
-   Comprehensive sidebar navigation with new sections for "Connect Accounts" and "Music Library".
-   Streamlined video generation workflow (Setup, Generate, Preview & Download).
-   User profile display and clear credit system interface.

## System Design Choices
-   **Monetization**: Comprehensive credit system based on actual AI service costs, including free credits for new users.
-   **Storage Management**: 10-video storage limit per user with automatic deletion of oldest videos.
-   **Multilingual Support**: Expanded language support (10 languages including Hindi and Urdu) with OpenAI GPT-4o for script generation and multilingual text-to-speech.
-   **Cost Optimization**: Default image provider set to Runware for efficiency.

# External Dependencies

-   **OpenAI GPT-4/GPT-4o**: Script generation, image prompt creation, and multilingual text generation.
-   **OpenAI Text-to-Speech**: High-quality voice synthesis.
-   **DALL-E 3**: Image generation from AI-created prompts.
-   **FFmpeg**: Video compilation, text overlay, and various video enhancements.
-   **Google OAuth**: User authentication.
-   **YouTube API**: Integration for connecting accounts and direct video uploads.
-   **FreePD/Pixabay**: Sources for royalty-free background music.
-   **Neon Database**: Serverless PostgreSQL hosting.