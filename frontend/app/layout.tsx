import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LiDAR Web Dashboard',
  description: 'Real-time LiDAR point cloud visualization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
