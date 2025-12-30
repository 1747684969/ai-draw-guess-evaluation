import type { Metadata, Viewport } from 'next';
import './globals.css';
import './responsive-fixes.css';

export const metadata: Metadata = {
  title: '你画我猜 - AI猜画游戏',
  description: '在线你画我猜游戏，AI会猜测你画的内容',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

