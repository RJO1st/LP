// ═══════════════════════════════════════════════════════════════════════════
// MOBILE UPLOAD PAGE
// File: src/app/upload-work/[sessionId]/page.jsx
// Mobile-optimized page for uploading work photos via QR code
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseKeys } from '@/lib/env';
import { Camera, CheckCircle, AlertCircle, Upload, X } from 'lucide-react';

export default function MobileUploadPage({ params }) {
  const { sessionId } = params;

  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );

  const [session, setSession] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileSize, setFileSize] = useState(0);

  // Load session details
  useEffect(() => {
    async function loadSession() {
      const { data, error: sessionError } = await supabase
        .from('work_upload_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (sessionError || !data) {
        setError('Invalid or expired session. Please scan the QR code again.');
        return;
      }

      // Check if already uploaded
      if (data.photo_url) {
        setSuccess(true);
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('Session expired. Please start a new quiz attempt.');
        return;
      }

      setSession(data);
    }

    loadSession();
  }, [sessionId]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Maximum size is 5MB.');
      return;
    }

    setFileSize(file.size);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!preview) {
      setError('Please select a photo first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Convert base64 to blob
      const response = await fetch(preview);
      const blob = await response.blob();

      // Generate filename
      const fileName = `work_${sessionId}_${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('scholar-work')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('scholar-work')
        .getPublicUrl(fileName);

      // Update session with photo URL
      const { error: updateError } = await supabase
        .from('work_upload_sessions')
        .update({
          photo_url: publicUrl,
          photo_uploaded_at: new Date().toISOString(),
          photo_file_size: fileSize
        })
        .eq('session_id', sessionId);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Clear preview and start over
  const handleClear = () => {
    setPreview(null);
    setFileSize(0);
    setError(null);
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            
            <h1 className="text-3xl font-bold text-green-800 mb-3">
              Photo Uploaded! ✓
            </h1>
            
            <p className="text-green-700 mb-6">
              Your work has been successfully uploaded
            </p>

            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6">
              <p className="text-sm text-green-800">
                <strong>Next steps:</strong><br/>
                Return to your laptop and complete your answer
              </p>
            </div>

            <button
              onClick={() => window.close()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl"
            >
              Close This Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-600" size={48} />
            </div>
            
            <h1 className="text-2xl font-bold text-red-800 mb-3">
              Upload Error
            </h1>
            
            <p className="text-red-700 mb-6">
              {error}
            </p>

            <button
              onClick={() => window.close()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Main upload interface
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-2xl mx-auto p-6">
        
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Upload Your Work</h1>
          <p className="text-slate-400">
            Take a clear photo of your written solution
          </p>
        </div>

        {/* Guidelines */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Photo Guidelines
          </h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-green-400 flex-shrink-0">✓</span>
              <span>Show all your working and calculations</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 flex-shrink-0">✓</span>
              <span>Make sure handwriting is clear and legible</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 flex-shrink-0">✓</span>
              <span>Include formulas and step-by-step work</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 flex-shrink-0">✓</span>
              <span>Take photo in good lighting</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 flex-shrink-0">✓</span>
              <span>Avoid shadows and blur</span>
            </li>
          </ul>
        </div>

        {/* Preview or Camera Input */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          {!preview ? (
            <div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="photo-input"
              />
              
              <label
                htmlFor="photo-input"
                className="block w-full bg-indigo-600 hover:bg-indigo-700 text-center py-4 rounded-xl font-bold cursor-pointer transition-colors"
              >
                <Camera className="inline mr-2 mb-1" size={24} />
                Take Photo
              </label>
              
              <p className="text-center text-sm text-slate-400 mt-4">
                or choose from gallery
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Work preview" 
                  className="w-full rounded-xl border-2 border-slate-700"
                />
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="text-sm text-slate-400 text-center">
                File size: {(fileSize / 1024).toFixed(1)} KB
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Upload size={20} />
                    Upload Photo
                  </span>
                )}
              </button>

              <button
                onClick={handleClear}
                className="w-full border-2 border-slate-600 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Retake Photo
              </button>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Footer notice */}
        <div className="bg-slate-800/50 rounded-xl p-4 text-center text-sm text-slate-400">
          🔒 Photo will be validated for academic integrity
        </div>
      </div>
    </div>
  );
}