import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Play, 
  Clock, 
  Mic, 
  Image as ImageIcon, 
  Download, 
  HelpCircle,
  Video,
  Zap,
  Settings
} from "lucide-react";

export default function Help() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-4" data-testid="text-help-title">
          Help & Documentation
        </h1>
        <p className="text-lg text-slate-600">
          Learn how to create amazing explainer videos with AI
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Quick Start Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">1</div>
              <div>
                <h4 className="font-medium text-slate-900">Enter Your Topic</h4>
                <p className="text-slate-600 text-sm">Describe what you want to explain. Be specific for better results.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">2</div>
              <div>
                <h4 className="font-medium text-slate-900">Choose Duration</h4>
                <p className="text-slate-600 text-sm">Select from 30 seconds to 3 minutes based on your content needs.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">3</div>
              <div>
                <h4 className="font-medium text-slate-900">Generate & Download</h4>
                <p className="text-slate-600 text-sm">AI creates the script, images, audio, and compiles your video automatically.</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/">
              <Button data-testid="button-start-creating">Start Creating Videos</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Video className="h-4 w-4" />
              <span>AI Script Writing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              GPT-4 generates engaging, informative scripts tailored to your topic and duration.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <ImageIcon className="h-4 w-4" />
              <span>Visual Generation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              DALL-E creates relevant images that perfectly match your script content.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Mic className="h-4 w-4" />
              <span>Voice Synthesis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              High-quality text-to-speech with multiple voice styles and natural intonation.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span>Frequently Asked Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="what-topics">
              <AccordionTrigger>What types of topics work best?</AccordionTrigger>
              <AccordionContent>
                <p className="text-slate-600">
                  Educational content, how-to guides, product explanations, concept introductions, and process overviews work excellently. 
                  Be specific about what you want to explain - for example, "How photosynthesis works in plants" is better than just "photosynthesis".
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="duration-guide">
              <AccordionTrigger>How should I choose the video duration?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-slate-600">
                  <p><strong>30 seconds:</strong> Quick overviews, simple concepts (3-4 key points)</p>
                  <p><strong>1 minute:</strong> Detailed explanations, step-by-step processes (5-6 sections)</p>
                  <p><strong>2 minutes:</strong> Comprehensive guides, complex topics (7-8 sections)</p>
                  <p><strong>3 minutes:</strong> In-depth tutorials, detailed walkthroughs (10+ sections)</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="voice-styles">
              <AccordionTrigger>What are the different voice styles?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Professional</Badge>
                    <span>Clear, authoritative voice for business content</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Casual</Badge>
                    <span>Friendly, conversational tone for general topics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Enthusiastic</Badge>
                    <span>Energetic, engaging voice for exciting content</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Educational</Badge>
                    <span>Clear, patient tone perfect for learning materials</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="image-styles">
              <AccordionTrigger>What image styles are available?</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Modern</Badge>
                    <span>Clean, contemporary design with sharp graphics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Illustrated</Badge>
                    <span>Hand-drawn style, artistic and creative</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Photographic</Badge>
                    <span>Realistic photos and detailed imagery</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Minimalist</Badge>
                    <span>Simple, clean design with essential elements only</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="generation-time">
              <AccordionTrigger>How long does video generation take?</AccordionTrigger>
              <AccordionContent>
                <p className="text-slate-600">
                  Typically 2-4 minutes depending on video length and complexity. The process includes script generation (30 seconds), 
                  image creation (1-2 minutes), audio synthesis (30 seconds), and video compilation (30 seconds).
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="download-formats">
              <AccordionTrigger>What video formats can I download?</AccordionTrigger>
              <AccordionContent>
                <p className="text-slate-600">
                  Videos are generated in MP4 format at 1920x1080 resolution with AAC audio compression. 
                  This format is compatible with all major platforms and devices.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 mb-2">
                Can't find what you're looking for? We're here to help.
              </p>
              <p className="text-sm text-slate-500">
                Contact our support team for technical assistance or feature requests.
              </p>
            </div>
            <Button variant="outline" data-testid="button-contact-support">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}