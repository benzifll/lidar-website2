# LiDAR Web Dashboard

A full-stack web application for visualizing and controlling a USB-connected LiDAR sensor (RPLiDAR protocol).

## Architecture

- **Frontend**: Next.js (React) deployed on Vercel or run locally.
- **Backend**: Python FastAPI with WebSocket and pySerial, running locally.

## Setup Instructions

### 1. Backend (Python Server)

The Python backend connects to your LiDAR hardware via USB and streams data over a WebSocket.

1. Ensure Python 3.8+ is installed.
2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   python server.py
   ```
   *The server will automatically scan your COM ports to find the LiDAR.*

### 2. Frontend (Next.js App)

#### Running Locally

1. Ensure Node.js is installed.
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

#### Deploying to Vercel

1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Set the Root Directory to `frontend`.
4. Add the following Environment Variable in Vercel:
   - `NEXT_PUBLIC_WS_URL` = `ws://localhost:8765` (or your PC's local IP address if testing from another device on the same network).
5. Click Deploy.
