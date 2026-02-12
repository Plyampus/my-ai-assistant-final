import './globals.css';

export const metadata = {
  title: 'AI Assistant',
  description: 'Your personal AI assistant with memory',
  appleWebApp: {
    title: 'AI Assistant',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
