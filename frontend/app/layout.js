import './globals.css';

export const metadata = {
  title: 'AI Assistant',
  description: 'Your personal AI assistant with memory',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    title: 'AI Assistant',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
