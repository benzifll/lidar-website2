/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images served from the backend tunnel URL at runtime.
  // On Vercel, NEXT_PUBLIC_API_URL will be set to your ngrok/cloudflared host.
  images: {
    remotePatterns: [
      // Local development
      { protocol: 'http',  hostname: 'localhost',       port: '8765' },
      // ngrok free tier (*.ngrok-free.app)
      { protocol: 'https', hostname: '*.ngrok-free.app' },
      // cloudflared tunnels (*.trycloudflare.com)
      { protocol: 'https', hostname: '*.trycloudflare.com' },
      // Add your own domain here if you use a custom tunnel
    ],
  },
};

module.exports = nextConfig;
