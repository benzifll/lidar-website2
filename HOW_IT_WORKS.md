# 360° LiDAR Scanner Project Breakdown

This document explains how the entire project works, broken down into Hardware (the physical parts) and Software (the code and servers). You can use this to explain the project to judges, teachers, or friends.

---

## 1. The Hardware (The Physical Machine)

The physical device is responsible for spinning around, shooting a laser, measuring distance, and sending that data to the computer.

*   **Benewake TF-Luna (The "Eye"):** This is a single-point LiDAR (Light Detection and Ranging) sensor. It works by shooting an invisible laser beam at an object and measuring exactly how long it takes for the light to bounce back (Time-of-Flight). This tells us exactly how far away the object is.
*   **NEMA 17 Stepper Motor (The "Neck"):** A highly precise motor (specifically the *Busheng 17HD34008*). Unlike a regular RC car motor that just spins wildly, a stepper motor moves in exact, microscopic "steps" (200 steps for a full 360° circle). This allows us to know *exactly* what angle the laser is pointing at at all times.
*   **A4988 Motor Driver (The "Muscle"):** The brain of the machine is too weak to power the heavy motor directly. This driver takes tiny electrical signals from the brain and translates them into high-power electrical pulses to move the motor.
*   **ESP Microcontroller (The "Brain"):** (NodeMCU ESP8266/ESP32). This is a tiny, cheap computer. Its job is to orchestrate everything: it tells the driver to move the motor one step, asks the TF-Luna for a distance reading, pairs the angle with the distance, and sends that package of data over a USB cable to your laptop.

---

## 2. The Software (The Code & Servers)

The software takes the raw numbers from the hardware and turns them into a beautiful, interactive web dashboard. It is split into three main parts:

### A. The Firmware (C++ / Arduino)
This code lives permanently inside the ESP Microcontroller. 
*   **What it does:** It runs a continuous loop. It takes exactly 200 samples per revolution. For every sample, it moves the motor slightly, pauses for a few milliseconds to let the physical vibrations settle, reads the distance via the I2C protocol, and fires the data (`Angle, Distance`) over the USB serial cable.

### B. The Python Backend (The "Translator & Memory")
This script runs locally on your physical Windows laptop because it needs physical access to the USB port.
*   **The Parser:** It constantly listens to the USB port. When it sees raw data from the ESP, it cleans it up and formats it.
*   **The Broadcaster (FastAPI & WebSockets):** It takes the clean data and broadcasts it live at lightning speed (up to 30 times a second) over a WebSocket connection.
*   **The Database (SQLite):** It holds a local database. When you click "Save Map", it permanently stores the 2D map coordinates and any images/videos (artefacts) you upload to specific locations on that map.

### C. The Next.js Frontend (The "Face")
This is the modern website hosted in the cloud on **Vercel**. 
*   **Live Radar:** It receives the WebSocket data and uses React to draw the green dots on a circular radar grid in real-time. 
*   **Interactive Gallery:** It lets you browse historical scans, drop pins on the map, and attach media (like photos of the room you scanned) to exact coordinates.

### D. The ngrok Tunnel (The "Bridge")
Because the Vercel website lives in the cloud, and your Python backend lives on your private home Wi-Fi, they normally couldn't talk to each other. **ngrok** punches a secure, temporary tunnel through the internet so the cloud website can directly retrieve the LiDAR data from your laptop.

---

## 3. The Full Data Pipeline (How data travels)

If someone asks "How does the data get to the screen?", explain this pipeline:

1. Laser bounces off a wall and hits the **TF-Luna**.
2. **ESP** reads the distance and sends it via **USB Cable**.
3. **Python** reads the USB cable and sends it to the **ngrok Tunnel**.
4. The **ngrok Tunnel** sends it over the internet to the **Vercel Website**.
5. The **Website** draws a green dot on your screen.
