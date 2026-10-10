import './globals.css';
import PageTransition from './components/PageTransition';

export const metadata = {
  title: 'sXL - Super Express Logistics Center',
  description: 'Ship Faster. Track Smarter.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
