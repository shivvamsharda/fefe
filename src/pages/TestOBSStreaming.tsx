
import React from 'react';
import Layout from '@/components/layout/Layout';
import TestOBSStreamingStudio from '@/components/stream/TestOBSStreamingStudio';

const TestOBSStreaming = () => {
  return (
    <Layout>
      <div className="container py-8 pt-24 md:pt-8">
        <h1 className="text-3xl font-bold mb-6">Cloudflare Stream Test Environment</h1>
        <p className="text-white/70 mb-6">
          Isolated test environment for experimenting with Cloudflare Stream. No production connections or authentication required.
        </p>
        <TestOBSStreamingStudio />
      </div>
    </Layout>
  );
};

export default TestOBSStreaming;
