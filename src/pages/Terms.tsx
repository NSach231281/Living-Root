import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../components/ui/LoadingScreen";
import { FileText, ChevronRight } from "lucide-react";

const LAST_UPDATED = "5 July 2026";
const COMPANY      = "SANS Collective Ventures";
const APP          = "Living Root";
const EMAIL        = "livingrootspace@gmail.com";

export default function Terms() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <PageShell>
      {/* Hero */}
      <section className="bg-brand-earth py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-brand-gold mb-4">
            <FileText size={16} />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Legal</span>
          </div>
          <h1 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-white/60 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-brand-sand border-b border-brand-border px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-brand-muted">
          <Link to="/" className="hover:text-brand-spice transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-brand-earth font-bold">Terms &amp; Conditions</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Intro box */}
        <div className="bg-brand-sand rounded-2xl p-6 mb-10 border border-brand-border">
          <p className="text-brand-clay leading-relaxed text-sm">
            These Terms &amp; Conditions govern your use of the {APP} app, website, and physical space
            operated by <strong className="text-brand-earth">{COMPANY}</strong>. By registering for an
            event, purchasing a ticket, or using our platform, you agree to these terms in full.
            Please read them carefully.
          </p>
        </div>

        <div className="space-y-10">

          {/* 1 */}
          <Section num="1" title="Acceptance of Terms">
            <p>
              By accessing or using the {APP} app or website, registering for an event, purchasing
              a membership, or visiting the {APP} space, you confirm that you have read, understood,
              and agree to be bound by these Terms &amp; Conditions and our Privacy Policy.
            </p>
            <p>
              If you do not agree to these terms, please do not use our services.
            </p>
          </Section>

          {/* 2 */}
          <Section num="2" title="Event Bookings and Tickets">
            <SubSection title="Registration">
              <p>
                To book a seat at any {APP} event, you must provide accurate personal details including
                your name, email address, and phone number. Providing false information may result in
                cancellation of your booking without refund.
              </p>
            </SubSection>
            <SubSection title="Ticket confirmation">
              <p>
                A booking is confirmed only after we have received and verified your payment (for paid
                events) or upon successful submission of the registration form (for free events).
                Your ticket will be sent to the email address you provide.
              </p>
            </SubSection>
            <SubSection title="Entry">
              <p>
                Please present your ticket QR code at the door — either on your phone or printed.
                {APP} reserves the right to refuse entry if a valid ticket cannot be verified.
              </p>
            </SubSection>
            <SubSection title="Seat capacity">
              <p>
                All events have a limited number of seats. Tickets are issued on a first-come,
                first-served basis. Registering for an event does not guarantee entry if the event
                reaches capacity before your payment is confirmed.
              </p>
            </SubSection>
          </Section>

          {/* 3 — NO REFUNDS — prominent */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <h2 className="font-serif text-xl font-bold text-red-800 mb-3 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              Cancellation &amp; Refund Policy
            </h2>
            <div className="pl-10 space-y-3 text-sm text-red-900">
              <p className="font-bold text-red-800 text-base">
                All ticket sales and event bookings are final. No refunds will be issued under any circumstances.
              </p>
              <p>
                This includes but is not limited to: change of plans, illness, travel disruptions,
                or any other personal reason. We strongly encourage you to confirm your availability
                before completing your registration or payment.
              </p>
              <p>
                In the event that {APP} cancels or significantly reschedules an event (change of date
                or venue), registered participants will be offered either a full credit toward a future
                event of equal or lesser value, or a full refund at our discretion.
              </p>
              <p>
                Transfers of tickets to another person may be permitted at our discretion. Please
                contact us at <a href={`mailto:${EMAIL}`} className="underline font-bold">{EMAIL}</a> at
                least 24 hours before the event if you wish to transfer your ticket.
              </p>
            </div>
          </div>

          {/* 4 */}
          <Section num="4" title="Membership">
            <SubSection title="Membership terms">
              <p>
                {APP} memberships are available on a monthly or annual basis. Membership fees are
                non-refundable once payment has been processed. Memberships are personal and
                non-transferable.
              </p>
            </SubSection>
            <SubSection title="Benefits">
              <p>
                Membership benefits are subject to change. We will provide reasonable notice of any
                material changes to membership benefits. Continued use of your membership after such
                notice constitutes acceptance of the updated benefits.
              </p>
            </SubSection>
            <SubSection title="Cancellation">
              <p>
                You may cancel your membership at any time. Cancellation will take effect at the end
                of the current billing period. No pro-rata refunds will be issued for unused days.
              </p>
            </SubSection>
          </Section>

          {/* 5 */}
          <Section num="5" title="Code of Conduct">
            <p>
              {APP} is a community space built on respect, openness, and genuine connection.
              All visitors, members, and event participants are expected to:
            </p>
            <ul>
              <li>Treat all people in the space with respect, regardless of background, identity, or beliefs</li>
              <li>Follow instructions from {APP} staff and event hosts</li>
              <li>Not engage in behaviour that is disruptive, aggressive, or harmful to others</li>
              <li>Not bring or consume illegal substances on the premises</li>
              <li>Not bring weapons or items that could endanger others</li>
              <li>Respect the physical space — do not damage property or furniture</li>
            </ul>
            <p className="mt-3">
              {APP} reserves the right to remove any person from the premises or event who violates
              this code of conduct, without refund or compensation.
            </p>
          </Section>

          {/* 6 */}
          <Section num="6" title="Photography and Recording">
            <p>
              {APP} and its partners may take photographs or video recordings at events for use in
              marketing materials, social media, and press. By attending an event, you consent to
              being photographed or recorded in a group setting.
            </p>
            <p className="mt-3">
              If you do not wish to be photographed, please inform the {APP} team at the start of
              the event. We will make reasonable efforts to accommodate your preference, but cannot
              guarantee exclusion from all group photographs.
            </p>
            <p className="mt-3">
              Attendees may photograph or record for personal use. Recording of performances or
              workshops for commercial purposes requires prior written consent from {APP}.
            </p>
          </Section>

          {/* 7 */}
          <Section num="7" title="Payments">
            <p>
              All payments are processed in Indian Rupees (INR). For UPI payments, the transaction
              reference number (UTR) you provide is used to verify and confirm your booking.
              Providing a false or invalid UTR may result in cancellation of your booking.
            </p>
            <p className="mt-3">
              {APP} uses Yes Bank UPI for payment processing. We do not store your banking details,
              card information, or UPI credentials on our servers.
            </p>
          </Section>

          {/* 8 */}
          <Section num="8" title="Liability">
            <p>
              {APP} and {COMPANY} shall not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of our services or attendance at our events.
            </p>
            <p className="mt-3">
              Our total liability to you for any claim arising from these terms shall not exceed the
              amount you paid for the specific event or service giving rise to the claim.
            </p>
            <p className="mt-3">
              Attendance at {APP} events is at your own risk. {APP} is not responsible for personal
              injury, loss of property, or any other loss suffered at events, except where caused by
              our gross negligence.
            </p>
          </Section>

          {/* 9 */}
          <Section num="9" title="Intellectual Property">
            <p>
              All content on the {APP} app and website — including text, images, logos, and design
              — is the property of {COMPANY} or its licensors and is protected by applicable
              intellectual property laws.
            </p>
            <p className="mt-3">
              You may not reproduce, distribute, or use any content from the {APP} platform for
              commercial purposes without prior written consent.
            </p>
          </Section>

          {/* 10 */}
          <Section num="10" title="Changes to Events">
            <p>
              {APP} reserves the right to modify, reschedule, or cancel any event. In the event of
              a cancellation by {APP}, registered participants will be notified via email and/or
              WhatsApp at the earliest opportunity.
            </p>
            <p className="mt-3">
              {APP} is not liable for any costs incurred by participants (including travel, accommodation,
              or other expenses) in connection with a cancelled or rescheduled event.
            </p>
          </Section>

          {/* 11 */}
          <Section num="11" title="Governing Law and Disputes">
            <p>
              These Terms &amp; Conditions are governed by the laws of India. Any disputes arising
              from these terms shall be subject to the exclusive jurisdiction of the courts in
              Bengaluru, Karnataka.
            </p>
            <p className="mt-3">
              Before initiating any legal proceedings, we encourage you to contact us at{" "}
              <a href={`mailto:${EMAIL}`} className="text-brand-spice underline">{EMAIL}</a> to
              resolve the matter amicably.
            </p>
          </Section>

          {/* 12 */}
          <Section num="12" title="Changes to These Terms">
            <p>
              We may update these Terms &amp; Conditions from time to time. We will notify you of
              material changes by posting the new terms on this page and updating the "Last updated"
              date. Your continued use of {APP} services after changes are posted constitutes
              acceptance of the updated terms.
            </p>
          </Section>

          {/* Contact */}
          <div className="bg-brand-earth rounded-2xl p-6 text-white mt-10">
            <h3 className="font-serif text-xl font-bold mb-3">Questions?</h3>
            <p className="text-white/80 text-sm mb-4">
              If you have any questions about these Terms &amp; Conditions, reach out to us directly:
            </p>
            <a href={`mailto:${EMAIL}`} className="text-brand-gold underline text-sm">{EMAIL}</a>
            <p className="text-white/60 text-xs mt-2">{COMPANY} · JP Nagar, Bengaluru</p>
          </div>

        </div>

        {/* Footer links */}
        <div className="border-t border-brand-border mt-12 pt-6 flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-brand-spice hover:underline">Privacy Policy</Link>
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
      <p className="font-bold text-brand-earth mb-1">{title}</p>
      <div className="text-brand-clay leading-relaxed">{children}</div>
    </div>
  );
}
