'use client';

import Link from 'next/link';

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8"
        >
          &larr; Back to Nearby
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy & Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: January 2025</p>

        {/* Privacy Policy */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Privacy Policy</h2>

          <div className="space-y-6 text-slate-700 leading-relaxed">
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Information We Collect</h3>
              <p>
                Nearby collects minimal information to provide our service. When you use Nearby,
                you provide a location (address or coordinates) to search for nearby places.
                This location data is used only to query the Google Places API and is not stored
                on our servers.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">How We Use Your Information</h3>
              <p>
                The location you provide is used solely to find and display nearby places.
                We do not create user accounts, store your search history, or track your
                location over time.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Third-Party Services</h3>
              <p>
                Nearby uses the Google Maps Platform (including Google Places API and Google Maps)
                to provide location search and place information. When you use Nearby, your
                queries are processed through Google&apos;s services. Please review{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google&apos;s Privacy Policy
                </a>{' '}
                for information on how Google handles data.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Cookies</h3>
              <p>
                Nearby does not currently use cookies for tracking or advertising purposes.
                If this changes in the future, we will update this policy and notify users
                as appropriate.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Data Retention</h3>
              <p>
                We do not store your location data or search history on our servers.
                Place data is fetched in real-time from Google and displayed to you
                without being retained.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Your Rights</h3>
              <p>
                Since we don&apos;t store personal data, there is no personal information to
                access, correct, or delete. If you have questions about your data, please
                contact us.
              </p>
            </div>
          </div>
        </section>

        {/* Terms of Service */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Terms of Service</h2>

          <div className="space-y-6 text-slate-700 leading-relaxed">
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Service Description</h3>
              <p>
                Nearby is a web application that helps users discover places near a given
                location. We aggregate data from Google Places to provide information about
                nearby businesses and points of interest.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Accuracy of Information</h3>
              <p>
                Place information (hours, ratings, addresses, etc.) is provided by Google
                and third-party sources. While we strive to display accurate information,
                we cannot guarantee its accuracy. Always verify important details (such as
                business hours) directly with the establishment.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Acceptable Use</h3>
              <p>
                You agree to use Nearby only for lawful purposes and in a manner that does
                not infringe on the rights of others. You may not attempt to reverse engineer,
                scrape, or abuse the service.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Limitation of Liability</h3>
              <p>
                Nearby is provided &quot;as is&quot; without warranties of any kind. We are not
                liable for any damages arising from your use of the service, including but
                not limited to inaccurate place information, service interruptions, or
                decisions made based on information displayed.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Google Maps Platform</h3>
              <p>
                By using Nearby, you also agree to be bound by{' '}
                <a
                  href="https://cloud.google.com/maps-platform/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Maps Platform Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="https://policies.google.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Terms of Service
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="font-medium text-slate-900 mb-2">Changes to Terms</h3>
              <p>
                We may update these terms from time to time. Continued use of Nearby after
                changes constitutes acceptance of the updated terms.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="border-t border-slate-200 pt-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Contact</h2>
          <p className="text-slate-700">
            If you have questions about this policy or our service, please contact us at{' '}
            <a
              href="mailto:findnearby.llc@gmail.com"
              className="text-blue-600 hover:underline"
            >
              findnearby.llc@gmail.com
            </a>
          </p>
        </section>

        <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-700">
            Nearby
          </Link>
          {' '}&copy; {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
