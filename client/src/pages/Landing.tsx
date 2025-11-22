import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Zap, Globe, Clock, Star, Play } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">Explainer AI</span>
          </div>
          <Button onClick={() => window.location.href = '/api/login'} data-testid="button-login">
            Sign In with Google
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Create Amazing <span className="text-blue-600">Explainer Videos</span> in Minutes
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Transform any topic into engaging educational videos using AI. Get professional scripts, stunning visuals, 
            natural voice narration, and automatic video compilation - all powered by advanced AI technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="px-8 py-4 text-lg"
              data-testid="button-get-started"
            >
              <Play className="h-5 w-5 mr-2" />
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-4 text-lg"
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>AI-Powered Scripts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Generate engaging, educational scripts automatically using GPT-4. Perfect structure, tone, and timing for any topic.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>10 Languages Supported</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Create videos in English, Spanish, French, German, Chinese, Japanese, Portuguese, Italian, Hindi, and Urdu.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Ready in Minutes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                From topic to finished video in just 2-5 minutes. No video editing skills required.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Highlight */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Smart AI Provider Selection</h2>
            <p className="text-lg text-slate-600">
              Choose between premium DALL-E 3 images or budget-friendly Runware for up to 98.5% cost savings
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center p-6 border-2 border-blue-200 rounded-xl">
              <Star className="h-8 w-8 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Premium Quality</h3>
              <p className="text-slate-600 mb-4">DALL-E 3 powered images for the highest quality visuals</p>
              <div className="text-2xl font-bold text-blue-600">Premium</div>
            </div>
            
            <div className="text-center p-6 border-2 border-green-200 rounded-xl bg-green-50">
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Budget Friendly</h3>
              <p className="text-slate-600 mb-4">Runware FLUX models for excellent quality at 98.5% lower cost</p>
              <div className="text-2xl font-bold text-green-600">Budget</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Create Your First Video?</h2>
          <p className="text-lg text-slate-600 mb-8">
            Join thousands of educators, marketers, and content creators using AI to tell better stories.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="px-8 py-4 text-lg"
            data-testid="button-start-creating"
          >
            Start Creating Videos
          </Button>
        </div>
      </div>
    </div>
  );
}