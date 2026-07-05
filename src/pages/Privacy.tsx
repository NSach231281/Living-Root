import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../components/ui/LoadingScreen";
import { Shield, Mail, MapPin, ChevronRight } from "lucide-react";

const LAST_UPDATED = "5 July 2026";
const COMPANY      = "SANS Collective Ventures";
const APP          = "Living Root";
const ADDRESS      = "301, 14th Main, 15th Cross, 2nd Floor, JP Nagar 5th Phase, Bengaluru – 560078";
const EMAIL        = "livingrootspace@gmail.com";

export default function Privacy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <PageShell>
      {/* Hero */}
      <section className="bg-brand-earth py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-brand-gold mb-4">
            <Shield size={16} />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Legal</span>
          </div>
          <h1 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/60 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-brand-sand border-b border-brand-border px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-brand-muted">
          <Link to="/" className="hover:text-brand-spice transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-brand-earth font-bold">Privacy Policy</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Intro box */}
        <div className="bg-brand-sand rounded-2xl p-6 mb-10 border border-brand-border">
          <p className="text-brand-clay leading-relaxed text-sm">
            {APP} is operated by <strong className="text-brand-earth">{COMPANY}</strong>, a community space
            based in JP Nagar, Bengaluru. We take your privacy seriously. This policy explains what information
            we collect, why we collect it, and how we protect it. By using our app or website, you agree to
            the practices described here.
          </p>
        </div>

        <div className="space-y-10">

          {/* 1 */}
          <Section num="1" title="Information We Collect">
            <p>We collect information in the following ways:</p>
            <SubSection title="a) When you create an account">
              <ul>
                <li>Your name, email address and profile photo (via Google Sign-In)</li>
                <li>Your phone number (when you provide it during booking or registration)</li>
              </ul>
            </SubSection>
            <SubSection title="b) When you register for an event or buy a ticket">
              <ul>
                <li>Name, email address and phone number</li>
                <li>Number of seats/guests</li>
                <li>UPI transaction reference number (for paid events)</li>
                <li>Your response to optional questions (e.g. how you heard about us, first-time visitor)</li>
              </ul>
            </SubSection>
            <SubSection title="c) Automatically when you use our app or website">
              <ul>
                <li>Pages visited and time spent (via Google Analytics)</li>
                <li>Device type, browser, and approximate location (city level only)</li>
                <li>Referral source (e.g. WhatsApp link, Instagram, direct)</li>
              </ul>
            </SubSection>
          </Section>

          {/* 2 */}
          <Section num="2" title="How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Confirm and manage your event registrations and bookings</li>
              <li>Send your ticket and booking confirmation by email</li>
              <li>Send your ticket via WhatsApp if you opt in</li>
              <li>Verify entry at the event door (via QR code scan)</li>
              <li>Send you updates about upcoming events at Living Root (you can opt out at any time)</li>
              <li>Improve our events and programming based on attendance patterns</li>
              <li>Process membership applications and renewals</li>
              <li>Respond to your queries or complaints</li>
            </ul>
            <p className="mt-4 text-sm text-brand-muted">
              We do not sell your personal information to any third party. We do not use your data for
              advertising on external platforms without your explicit consent.
            </p>
          </Section>

          {/* 3 */}
          <Section num="3" title="Communications">
            <p>
              By registering for an event or creating an account, you agree to receive transactional
              communications from us — including booking confirmations, ticket emails, and event reminders.
            </p>
            <p className="mt-3">
              We may also send you occasional updates about new events and Living Root programming.
              You can unsubscribe from these at any time by replying STOP to any WhatsApp message or
              clicking Unsubscribe in any email.
            </p>
            <p className="mt-3 text-sm text-brand-muted">
              We use <strong>Resend</strong> for email delivery and <strong>Twilio/WhatsApp Business</strong>
              {" "}for WhatsApp messages. Your phone number and email are shared with these providers
              solely to deliver your communications.
            </p>
          </Section>

          {/* 4 */}
          <Section num="4" title="Third-Party Services">
            <p>We use the following third-party services to operate Living Root:</p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-brand-sand">
                    <th className="text-left p-3 font-bold text-brand-earth border border-brand-border">Service</th>
                    <th className="text-left p-3 font-bold text-brand-earth border border-brand-border">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Google Firebase", "Authentication, real-time database, app hosting"],
                    ["Supabase", "Event registration records and ticketing database"],
                    ["Google Analytics", "Anonymous usage analytics"],
                    ["Resend", "Ticket and booking email delivery"],
                    ["Twilio / WhatsApp", "WhatsApp ticket delivery (opt-in only)"],
                    ["Yes Bank UPI", "Payment processing for paid events"],
                    ["Vercel", "App hosting and deployment"],
                  ].map(([s, p]) => (
                    <tr key={s} className="border border-brand-border">
                      <td className="p-3 font-medium text-brand-earth">{s}</td>
                      <td className="p-3 text-brand-clay">{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-brand-muted">
              Each provider has their own privacy policy governing how they handle data.
              We only share the minimum information necessary for each service to function.
            </p>
          </Section>

          {/* 5 */}
          <Section num="5" title="Data Retention">
            <p>
              We retain your registration and booking records for a period of 3 years for accounting
              and operational purposes, in accordance with Indian tax and business regulations.
            </p>
            <p className="mt-3">
              Analytics data is retained in anonymised, aggregated form. No individual-level analytics
              data is retained for more than 14 months.
            </p>
            <p className="mt-3">
              You may request deletion of your personal data at any time by emailing us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-brand-spice underline">{EMAIL}</a>.
              We will process deletion requests within 30 days, except where retention is required by law.
            </p>
          </Section>

          {/* 6 */}
          <Section num="6" title="Cookies and Tracking">
            <p>
              Our app uses cookies and similar technologies to keep you signed in and to understand
              how you use the app. We use Google Analytics to collect anonymous usage data
              (pages visited, session duration, device type). This data does not identify you personally.
            </p>
            <p className="mt-3">
              You can disable cookies in your browser settings, though this may affect your ability
              to sign in or use certain features of the app.
            </p>
          </Section>

          {/* 7 */}
          <Section num="7" title="Children's Privacy">
            <p>
              Living Root hosts events that welcome families and children. However, our app and website
              are not directed at children under the age of 13. We do not knowingly collect personal
              information from children under 13. If you believe we have inadvertently collected
              such information, please contact us immediately.
            </p>
            <p className="mt-3">
              For family and kids events, registration is completed by a parent or guardian on behalf
              of the child.
            </p>
          </Section>

          {/* 8 */}
          <Section num="8" title="Security">
            <p>
              We take reasonable technical and organisational measures to protect your personal data
              against unauthorised access, loss, or misuse. These include encrypted data transmission
              (HTTPS), access controls, and secure third-party services.
            </p>
            <p className="mt-3 text-sm text-brand-muted">
              No method of transmission over the internet is 100% secure. While we strive to protect
              your data, we cannot guarantee absolute security.
            </p>
          </Section>

          {/* 9 */}
          <Section num="9" title="Your Rights">
            <p>Under applicable Indian law and general privacy principles, you have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal data</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Lodge a complaint with the relevant authority if you believe your rights have been violated</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-brand-spice underline">{EMAIL}</a>.
            </p>
          </Section>

          {/* 10 */}
          <Section num="10" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices
              or legal requirements. When we do, we will update the "Last updated" date at the top of
              this page and, where appropriate, notify you by email.
            </p>
            <p className="mt-3">
              Your continued use of the app after any changes constitutes your acceptance of the
              updated policy.
            </p>
          </Section>

          {/* 11 */}
          <Section num="11" title="Governing Law">
            <p>
              This Privacy Policy is governed by the laws of India, including the Information
              Technology Act, 2000 and applicable rules thereunder.
            </p>
          </Section>

          {/* Contact */}
          <div className="bg-brand-earth rounded-2xl p-6 text-white mt-10">
            <h3 className="font-serif text-xl font-bold mb-4">Contact Us</h3>
            <p className="text-white/80 text-sm mb-4">
              If you have any questions about this Privacy Policy or how we handle your data,
              please reach out:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-white/80">
                <Mail size={14} className="text-brand-gold flex-shrink-0"/>
                <a href={`mailto:${EMAIL}`} className="text-brand-gold underline">{EMAIL}</a>
              </div>
              <div className="flex items-start gap-2 text-white/80">
                <MapPin size={14} className="text-brand-gold flex-shrink-0 mt-0.5"/>
                <span>{COMPANY}<br/>{ADDRESS}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer links */}
        <div className="border-t border-brand-border mt-12 pt-6 flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="text-brand-spice hover:underline">Terms & Conditions</Link>
          <Link to="/events" className="text-brand-muted hover:text-brand-spice">Browse Events</Link>
          <Link to="/" className="text-brand-muted hover:text-brand-spice">Back to Home</Link>
        </div>
      </div>
    </PageShell>
  );
}

function Section({ num, title, children }: { num:string; title:string; children:React.ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold text-brand-earth mb-4 flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-brand-spice text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </span>
        {title}
      </h2>
      <div className="pl-10 text-brand-clay text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="font-bold text-brand-earth mb-2">{title}</p>
      <div className="text-brand-clay leading-relaxed">{children}</div>
    </div>
  );
}
