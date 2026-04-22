// ═══════════════════════════════════════════════════════════════════════════
// FLEXIBLE UPLOAD COMPONENT - Camera OR QR Code
// File: src/components/game/FlexibleWorkUpload.jsx
// Detects device capability and offers best upload method
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseKeys } from '@/lib/env';
import QRCode from 'qrcode';
import { Camera, Smartphone, Upload, X, CheckCircle } from 'lucide-react';

export default function FlexibleWorkUpload({ sessionId, onPhotoUploaded }) {
  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
  );

  const [uploadMethod, setUploadMethod] = useState(null); // 'camera' or 'qr'
  const [hasCamera, setHasCamera] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [workPhotoUrl, setWorkPhotoUrl] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const pollInterval = useRef(null);

  // Check if device has camera
  useEffect(() => {
    async function checkCamera() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);
      } catch (err) {
        console.log('Camera check failed:', err);
        setHasCamera(false);
      }
    }

    checkCamera();
  }, []);

  // Generate QR code for mobile upload
  useEffect(() => {
    async function generateQR() {
      const uploadLink = `${window.location.origin}/upload-work/${sessionId}`;
      setUploadUrl(uploadLink);

      try {
        const qrDataUrl = await QRCode.toDataURL(uploadLink, {
          width: 250,
          margin: 2
        });
        setQrCodeUrl(qrDataUrl);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    }

    if (sessionId) {
      generateQR();
    }
  }, [sessionId]);

  // Poll for QR uploaded photo
  useEffect(() => {
    if (uploadMethod === 'qr' && !workPhotoUrl) {
      pollInterval.current = setInterval(async () => {
        const { data } = await supabase
          .from('work_upload_sessions')
          .select('photo_url')
          .eq('session_id', sessionId)
          .single();

        if (data?.photo_url) {
          setWorkPhotoUrl(data.photo_url);
          onPhotoUploaded(data.photo_url);
          clearInterval(pollInterval.current);
        }
      }, 2000);

      return () => {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
        }
      };
    }
  }, [uploadMethod, sessionId, workPhotoUrl]);

  // Handle camera upload
  const handleCameraUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Maximum 5MB.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase
      const fileName = `work_${sessionId}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('scholar-work')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('scholar-work')
        .getPublicUrl(fileName);

      // Update session
      await supabase
        .from('work_upload_sessions')
        .update({
          photo_url: publicUrl,
          photo_uploaded_at: new Date().toISOString(),
          photo_file_size: file.size
        })
        .eq('session_id', sessionId);

      setWorkPhotoUrl(publicUrl);
      onPhotoUploaded(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Clear and retry
  const handleClear = () => {
    setPreview(null);
    setWorkPhotoUrl(null);
    setUploadMethod(null);
    setError(null);
  };

  // Method selection screen
  if (!uploadMethod) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Camera size={20} />
          Upload Photo of Your Work
        </h3>

        <div className="space-y-3">
          {/* Option 1: Use Device Camera (if available) */}
          {hasCamera && (
            <button
              onClick={() => setUploadMethod('camera')}
              className="w-full p-4 border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Camera className="text-indigo-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900">Use This Device's Camera</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Take a photo directly from your tablet/laptop camera
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Option 2: Send to Phone */}
          <button
            onClick={() => setUploadMethod('qr')}
            className="w-full p-4 border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-xl transition-all text-left"
          >
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Smartphone className="text-green-600" size={24} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900">Send to My Phone</div>
                <div className="text-sm text-slate-600 mt-1">
                  Scan QR code and upload from your phone camera
                </div>
              </div>
            </div>
          </button>

          {!hasCamera && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              💡 No camera detected on this device. Use the QR code option to upload from your phone.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Camera upload view
  if (uploadMethod === 'camera') {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Camera size={20} />
            Camera Upload
          </h3>
          <button
            onClick={handleClear}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Change method
          </button>
        </div>

        {!workPhotoUrl ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraUpload}
                className="hidden"
              />
              
              {!preview ? (
                <div>
                  <Camera size={48} className="mx-auto mb-3 text-slate-400" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold"
                  >
                    {uploading ? 'Uploading...' : 'Take Photo'}
                  </button>
                  <p className="text-sm text-slate-600 mt-3">
                    Or choose from gallery
                  </p>
                </div>
              ) : (
                <div>
                  <img src={preview} alt="Preview" className="max-w-full rounded-lg mb-3" />
                  {uploading && (
                    <div className="flex items-center justify-center gap-2 text-indigo-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                      Uploading...
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="text-sm text-slate-600 space-y-2">
              <p className="font-bold">📋 Make sure your photo shows:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All your working and calculations</li>
                <li>Clear, legible handwriting</li>
                <li>Formulas and step-by-step work</li>
                <li>Good lighting (no shadows)</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 font-bold">
              <CheckCircle size={20} />
              Photo uploaded successfully!
            </div>
            <div className="border-2 border-green-200 rounded-xl p-2">
              <img src={workPhotoUrl} alt="Uploaded work" className="w-full rounded-lg" />
            </div>
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:underline"
            >
              Upload different photo
            </button>
          </div>
        )}
      </div>
    );
  }

  // QR code upload view
  if (uploadMethod === 'qr') {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Smartphone size={20} />
            Phone Upload
          </h3>
          <button
            onClick={handleClear}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Change method
          </button>
        </div>

        {!workPhotoUrl ? (
          <div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
              <div className="text-yellow-600 mb-3">
                <Upload size={32} className="mx-auto" />
              </div>
              <p className="font-bold mb-2">Waiting for photo from phone...</p>
              <p className="text-sm text-slate-600 mb-4">
                Scan the QR code below with your phone
              </p>

              {qrCodeUrl && (
                <div className="bg-slate-50 p-4 rounded-xl inline-block">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                <span>Open your phone camera</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                <span>Scan the QR code</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                <span>Take photo of your work</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                <span>Photo appears here automatically!</span>
              </div>
            </div>

            {uploadUrl && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Or open this link on your phone:</p>
                <a 
                  href={uploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline break-all"
                >
                  {uploadUrl}
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 font-bold">
              <CheckCircle size={20} />
              Photo received from phone!
            </div>
            <div className="border-2 border-green-200 rounded-xl p-2">
              <img src={workPhotoUrl} alt="Uploaded work" className="w-full rounded-lg" />
            </div>
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:underline"
            >
              Upload different photo
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}