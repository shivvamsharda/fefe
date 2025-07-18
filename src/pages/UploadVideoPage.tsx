
import React from 'react';
import Layout from "@/components/layout/Layout";
import VideoUploadForm from "@/components/upload/VideoUploadForm";
import { useNavigate } from 'react-router-dom';

const UploadVideoPage: React.FC = () => {
  const navigate = useNavigate();

  const handleUploadComplete = (videoId: string) => {
    console.log('Upload completed for video:', videoId);
    // Navigate to the uploaded videos page or video view
    navigate('/creator/videos');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Upload Your Video
            </h1>
            <p className="text-gray-600">
              Share your content with the world using Bunny Stream
            </p>
          </div>

          <VideoUploadForm onUploadComplete={handleUploadComplete} />

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              By uploading, you agree to our terms of service and confirm that your content
              complies with our community guidelines.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UploadVideoPage;
