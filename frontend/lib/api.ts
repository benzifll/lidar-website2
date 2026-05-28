/**
 * Central place for backend API base URL.
 *
 * In development this defaults to http://localhost:8765.
 * For Vercel (or any other host) set the environment variable:
 *
 *   NEXT_PUBLIC_API_URL=https://your-tunnel-url.ngrok.io
 *
 * The WebSocket URL is derived automatically (http → ws, https → wss).
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8765';

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_BASE.replace(/^http/, 'ws') + '/ws';
