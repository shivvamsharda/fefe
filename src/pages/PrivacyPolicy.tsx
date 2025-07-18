
import React from 'react';
import Layout from '@/components/layout/Layout';

const PrivacyPolicy = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-foreground/80 leading-relaxed">
              We collect information you provide directly to us, such as when you create an account, stream content, or contact us. This may include your username, email address, wallet address, and content you create or share.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-foreground/80 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and communicate with you about products, services, and promotional offers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
            <p className="text-foreground/80 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your information in certain limited circumstances, such as to comply with legal obligations or protect our rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Wallet Integration</h2>
            <p className="text-foreground/80 leading-relaxed">
              When you connect a cryptocurrency wallet, we store your wallet address to enable features like streaming and donations. We do not have access to your private keys or the ability to control your wallet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Google OAuth</h2>
            <p className="text-foreground/80 leading-relaxed">
              When you sign in with Google, we receive basic profile information including your email address and Google ID. We use this information to create and maintain your account on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Cookies and Tracking</h2>
            <p className="text-foreground/80 leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your preferences, and analyze how our service is used. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
            <p className="text-foreground/80 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibent mb-4">8. Data Retention</h2>
            <p className="text-foreground/80 leading-relaxed">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Your Rights</h2>
            <p className="text-foreground/80 leading-relaxed">
              You have the right to access, update, or delete your personal information. You can manage most of your information through your account settings or by contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
            <p className="text-foreground/80 leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="text-foreground/80 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-foreground/80 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at connect@wenlive.fun.
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

export default PrivacyPolicy;
