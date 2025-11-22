import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Eye, Type, Film, Star } from "lucide-react";

export default function VideoEnhancements() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2" data-testid="text-enhancements-title">
          <Sparkles className="h-8 w-8 text-blue-600" />
          Video Enhancements
        </h1>
        <p className="text-slate-600 mt-2">
          Professional cinematic features that make your explainer videos engaging and dynamic
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Animated Text Overlays */}
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-6 w-6 text-blue-600" />
              Animated Text Overlays
              <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                <Star className="h-3 w-3 mr-1" />
                New
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-slate-700">
                Each video segment now includes beautifully animated text that appears with smooth fade-in effects and gentle bouncing motion.
              </p>
              <div className="bg-white/70 rounded-lg p-4 border">
                <h4 className="font-semibold text-slate-800 mb-2">Features:</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Fade-in and fade-out transitions
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Gentle bouncing animation during display
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Professional typography with shadow effects
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Synchronized timing with narration
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ken Burns Effect */}
        <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-purple-600" />
              Ken Burns Zoom & Pan Effects
              <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                <Star className="h-3 w-3 mr-1" />
                Enhanced
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-slate-700">
                Transform static images into dynamic visuals with professional zoom and pan movements that add cinematic quality to your videos.
              </p>
              <div className="bg-white/70 rounded-lg p-4 border">
                <h4 className="font-semibold text-slate-800 mb-2">Multiple Patterns:</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-blue-500" />
                    Slow zoom-in from center for focus
                  </li>
                  <li className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-blue-500" />
                    Zoom-out with left-to-right panning
                  </li>
                  <li className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-blue-500" />
                    Zoom-in with top-to-bottom movement
                  </li>
                  <li className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-blue-500" />
                    Varied patterns for visual interest
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Professional Titles</h3>
            <p className="text-sm text-slate-600">
              Every video starts with an animated title page featuring your topic with elegant typography and smooth animations.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full mb-4">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Smooth Transitions</h3>
            <p className="text-sm text-slate-600">
              Seamless fade-in and fade-out transitions between segments create a polished, professional viewing experience.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mb-4">
              <Film className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Cinematic Quality</h3>
            <p className="text-sm text-slate-600">
              1080p HD output with professional encoding settings ensures your videos look great on any platform.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Technical Details */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Technical Implementation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Animation Engine</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• FFmpeg-powered video processing</li>
                <li>• Hardware-accelerated rendering</li>
                <li>• Professional H.264 encoding</li>
                <li>• Optimized for web and mobile playback</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Quality Features</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• 1920x1080 full HD resolution</li>
                <li>• 128kbps AAC audio encoding</li>
                <li>• Consistent 25fps frame rate</li>
                <li>• Anti-aliased text rendering</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> All enhancement features are automatically applied to every video you generate. 
              No additional configuration required - just create your video and enjoy professional results!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}