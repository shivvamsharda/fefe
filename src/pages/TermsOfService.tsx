
import React from 'react';
import Layout from '@/components/layout/Layout';

const TermsOfService = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-foreground/80 leading-relaxed">
              By accessing and using WenLive.fun ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="text-foreground/80 leading-relaxed">
              WenLive.fun is a streaming platform that allows users to create, broadcast, and view live streams. Users can interact through chat, donations, and subscriptions. The platform supports both wallet-based and email-based authentication.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-foreground/80 leading-relaxed">
              You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Content Guidelines</h2>
            <p className="text-foreground/80 leading-relaxed">
              Users are prohibited from streaming content that is illegal, harmful, threatening, abusive, defamatory, vulgar, obscene, or otherwise objectionable. We reserve the right to remove content and suspend accounts that violate these guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Payment and Donations</h2>
            <p className="text-foreground/80 leading-relaxed">
              Donations and tips made through the platform are voluntary. We are not responsible for disputes between users regarding payments. All transactions are subject to the terms of the respective payment processors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-foreground/80 leading-relaxed">
              Users retain ownership of their original content but grant WenLive.fun a license to host, display, and distribute such content on the platform. Users must respect the intellectual property rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-foreground/80 leading-relaxed">
              WenLive.fun is provided "as is" without warranties of any kind. We shall not be liable for any damages arising from the use of our service, including but not limited to direct, indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
            <p className="text-foreground/80 leading-relaxed">
              We may terminate or suspend your account at any time for violations of these terms. You may also terminate your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-foreground/80 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p className="text-foreground/80 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at connect@wenlive.fun.
            </p>
          </section>
        </div>
        
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-foreground/60">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default TermsOfService;
