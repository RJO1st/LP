// ═══════════════════════════════════════════════════════════════════════════
// QR CODE QUIZ COMPONENT - Laptop View
// File: src/components/game/AdvancedQuizWithQR.jsx
// Shows question on laptop with QR code for mobile photo upload
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseKeys } from '@/lib/env';
import QRCode from 'qrcode';
import { Camera, Clock, CheckCircle, AlertCircle, Upload } from 'lucide-react';

export default function AdvancedQuizWithQR({ 
  question, 
  scholar, 
  onSubmit,
  onSkip 
}) {
  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );

  // State
  const [sessionId, setSessionId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [workPhotoUrl, setWorkPhotoUrl] = useState(null);
  const [numericalAnswer, setNumericalAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const startTime = useRef(Date.now());
  const pollInterval = useRef(null);

  // Initialize session and QR code
  useEffect(() => {
    async function initializeSession() {
      // Generate unique session ID
      const newSessionId = `${scholar.id}-${question.id}-${Date.now()}`;
      setSessionId(newSessionId);

      // Create upload session in database
      const { error: sessionError } = await supabase
        .from('work_upload_sessions')
        .insert({
          session_id: newSessionId,
          scholar_id: scholar.id,
          question_id: question.id,
          is_active: true
        });

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        setError('Failed to initialize quiz session');
        return;
      }

      // Generate upload URL
      const uploadLink = `${window.location.origin}/upload-work/${newSessionId}`;
      setUploadUrl(uploadLink);

      // Generate QR code
      try {
        const qrDataUrl = await QRCode.toDataURL(uploadLink, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('Failed to generate QR code');
      }

      // Start polling for uploaded photo
      pollInterval.current = setInterval(async () => {
        const { data } = await supabase
          .from('work_upload_sessions')
          .select('photo_url, photo_uploaded_at')
          .eq('session_id', newSessionId)
          .single();

        if (data?.photo_url) {
          setWorkPhotoUrl(data.photo_url);
          clearInterval(pollInterval.current);
        }
      }, 2000); // Poll every 2 seconds
    }

    initializeSession();

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [question.id, scholar.id]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle submission
  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!workPhotoUrl) {
      setError('Please upload a photo of your work using your phone');
      return;
    }

    if (!numericalAnswer || numericalAnswer.trim() === '') {
      setError('Please enter your numerical answer');
      return;
    }

    if (explanation.length < 200) {
      setError(`Explanation too short. Need ${200 - explanation.length} more characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to parent component
      await onSubmit({
        questionId: question.id,
        numericalAnswer: parseFloat(numericalAnswer),
        explanation: explanation.trim(),
        workPhotoUrl,
        timeSpentSeconds: timeSpent,
        sessionId
      });
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit answer. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Main: Question and Inputs (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Timer */}
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="text-indigo-600" size={24} />
              <div>
                <div className="text-2xl font-bold font-mono">{formatTime(timeSpent)}</div>
                <div className="text-sm text-slate-600">
                  Expected: {Math.floor(question.min_time_seconds / 60)}-{Math.floor(question.max_time_seconds / 60)} min
                </div>
              </div>
            </div>
            
            {timeSpent > 0 && timeSpent < question.min_time_seconds && (
              <div className="text-yellow-600 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                Take your time!
              </div>
            )}
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">{question.question_data.q}</h2>
            
            {question.has_diagram && question.diagram_url && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <img 
                  src={question.diagram_url} 
                  alt="Question diagram" 
                  className="max-w-full h-auto mx-auto"
                />
              </div>
            )}

            {question.question_data.hint && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-800">
                  <span className="font-bold">💡 Hint:</span> {question.question_data.hint}
                </p>
              </div>
            )}
          </div>

          {/* Work Photo Status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Camera size={20} />
              Photo of Your Work
            </h3>

            {!workPhotoUrl ? (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                <div className="text-yellow-600 mb-2">
                  <Upload size={48} className="mx-auto mb-3" />
                  <p className="font-bold">Waiting for photo...</p>
                </div>
                <p className="text-slate-600 text-sm mt-2">
                  Scan the QR code on the right with your phone to upload your work
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 font-bold">
                  <CheckCircle size={20} />
                  Work photo received!
                </div>
                <div className="border-2 border-green-200 rounded-xl p-2">
                  <img 
                    src={workPhotoUrl} 
                    alt="Your work" 
                    className="w-full rounded-lg"
                  />
                </div>
                <button
                  onClick={() => setWorkPhotoUrl(null)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Upload different photo
                </button>
              </div>
            )}
          </div>

          {/* Numerical Answer */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <label className="block font-bold text-lg mb-3">
              Your Calculated Answer:
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                step="0.01"
                value={numericalAnswer}
                onChange={(e) => setNumericalAnswer(e.target.value)}
                placeholder="Enter your answer"
                className="flex-1 px-4 py-3 text-lg font-mono border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <span className="font-bold text-lg text-slate-700">
                {question.question_data.units || ''}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <label className="block font-bold text-lg mb-3">
              Explain Your Method (minimum 200 characters):
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Describe step-by-step how you solved this problem. What formula did you use? Why did you choose that approach? Show your thinking process..."
              rows={8}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <div className={`text-sm ${explanation.length >= 200 ? 'text-green-600 font-bold' : 'text-slate-600'}`}>
                {explanation.length} / 200 characters
                {explanation.length >= 200 && ' ✓'}
              </div>
              {explanation.length > 0 && explanation.length < 200 && (
                <div className="text-sm text-yellow-600">
                  Need {200 - explanation.length} more characters
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-700 font-bold">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={!workPhotoUrl || !numericalAnswer || explanation.length < 200 || isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
            
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-6 py-4 border-2 border-slate-300 hover:bg-slate-50 rounded-xl font-bold transition-colors"
              >
                Skip
              </button>
            )}
          </div>

          {/* Academic Integrity Notice */}
          <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600 text-center">
            🔒 Your work photo, explanation, and timing are validated using AI to ensure academic integrity
          </div>
        </div>

        {/* Right: QR Code (1/3 width - sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <h3 className="font-bold text-lg mb-4 flex items-center justify-center gap-2">
                <Camera size={20} />
                Upload Work Photo
              </h3>

              {qrCodeUrl ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-xl mb-4">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code to upload work" 
                      className="w-full max-w-xs mx-auto"
                    />
                  </div>

                  <div className="space-y-3 text-left text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">
                        1
                      </div>
                      <p>Solve the problem on paper</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">
                        2
                      </div>
                      <p>Scan this QR code with your phone</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">
                        3
                      </div>
                      <p>Take a clear photo of your work</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold">
                        4
                      </div>
                      <p>Photo appears here automatically!</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    💡 <strong>Pro tip:</strong> Show all your working clearly. Include formulas, calculations, and diagrams.
                  </div>

                  {/* Manual link for testing */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">Or open this link on your phone:</p>
                    <a 
                      href={uploadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline break-all"
                    >
                      {uploadUrl}
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-slate-400">Generating QR code...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}