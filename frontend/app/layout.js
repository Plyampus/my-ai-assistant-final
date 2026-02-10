import './globals.css';

export const metadata = {
  title: 'AI Assistant',
  description: 'Your personal AI assistant with memory',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
