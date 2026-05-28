import asyncio
import json
import logging
from typing import List

import serial
import serial.tools.list_ports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from pydantic import BaseModel
import os
import smtplib
import base64
import uuid
from email.message import EmailMessage
from dotenv import load_dotenv

import database

load_dotenv()

from lidar_parser import LidarParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LidarServer")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure data directories exist and mount static files
os.makedirs("data/media", exist_ok=True)
app.mount("/media", StaticFiles(directory="data/media"), name="media")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Broadcast to all connected clients
        for connection in self.active_connections.copy():
            try:
                await connection.send_json(message)
            except (RuntimeError, WebSocketDisconnect, ConnectionClosedOK, ConnectionClosedError):
                self.disconnect(connection)

manager = ConnectionManager()
lidar_parser = LidarParser()

# Global state
serial_port = None
is_reading = False
current_port_name = "Unknown"
current_baud = 115200

def find_lidar_port():
    ports = serial.tools.list_ports.comports()
    if not ports:
        return None

    logger.info("Available serial ports:")
    for p in ports:
        logger.info(f"  {p.device} - {p.description} [{p.hwid}]")

    # Priority 1: Real USB serial ports (FTDI, CH340, CP210x, etc.)
    # These have 'USB' in their hwid and are NOT Bluetooth
    usb_ports = [
        p for p in ports
        if 'USB' in (p.hwid or '') and 'BTHENUM' not in (p.hwid or '')
    ]
    if usb_ports:
        chosen = usb_ports[0]
        logger.info(f"Auto-selected USB port: {chosen.device} - {chosen.description}")
        return chosen.device

    # Priority 2: Any non-Bluetooth port
    non_bt_ports = [
        p for p in ports
        if 'BTHENUM' not in (p.hwid or '')
    ]
    if non_bt_ports:
        chosen = non_bt_ports[0]
        logger.info(f"Auto-selected non-BT port: {chosen.device} - {chosen.description}")
        return chosen.device

    logger.warning("Only Bluetooth ports found — these cannot be used for a USB LiDAR sensor.")
    return None

async def serial_reader_task():
    global serial_port, is_reading, current_port_name, current_baud
    
    while True:
        if serial_port is None or not serial_port.is_open:
            port_name = find_lidar_port()
            if port_name:
                try:
                    logger.info(f"Attempting to open {port_name} at 115200 baud...")
                    # Set DTR/RTS to False to prevent ESP32 reset looping on some boards
                    serial_port = serial.Serial(port_name, 115200, timeout=1)
                    serial_port.setDTR(False)
                    serial_port.setRTS(False)
                    
                    current_port_name = port_name
                    current_baud = 115200
                    logger.info(f"Successfully connected to {port_name}")
                    
                    await manager.broadcast({
                        "type": "status",
                        "connected": True,
                        "port": current_port_name,
                        "baud": current_baud
                    })
                    
                    lidar_parser.buffer = ""
                    
                except Exception as e:
                    logger.error(f"Failed to open port: {e}")
                    serial_port = None
                    await manager.broadcast({
                        "type": "status",
                        "connected": False,
                        "port": "Unknown",
                        "baud": 115200
                    })
            
            if serial_port is None or not serial_port.is_open:
                await asyncio.sleep(3)
                continue

        try:
            if serial_port.in_waiting > 0:
                raw_data = serial_port.read(serial_port.in_waiting)
                points, events = lidar_parser.parse(raw_data)

                # Handle events first (scan_start, scan_end, log)
                for event in events:
                    if event["type"] == "scan_start":
                        is_reading = True
                        await manager.broadcast({
                            "type": "status",
                            "connected": True,
                            "port": current_port_name,
                            "baud": current_baud,
                            "scanning": True
                        })
                        logger.info("Scan started")

                    elif event["type"] == "scan_end":
                        is_reading = False
                        valid = event.get("valid_points", 0)
                        await manager.broadcast({
                            "type": "status",
                            "connected": True,
                            "port": current_port_name,
                            "baud": current_baud,
                            "scanning": False
                        })
                        await manager.broadcast({
                            "type": "error",
                            "message": f"✅ Scan complete — {valid} valid points"
                        })
                        logger.info(f"Scan ended — {valid} valid points")

                    elif event["type"] == "log":
                        msg = event.get("message", "")
                        logger.info(f"ESP32: {msg}")
                        # Forward all ESP32 log lines to the frontend log panel
                        await manager.broadcast({
                            "type": "error",
                            "message": msg
                        })

                # Send all parsed points in one batch
                if points:
                    await manager.broadcast({
                        "type": "scan",
                        "points": points
                    })

            # Yield control to event loop
            await asyncio.sleep(0.005)

        except OSError as e:
            logger.error(f"Serial OS Error (Timeout/Disconnect): {e}")
            if serial_port:
                serial_port.close()
            serial_port = None

        except Exception as e:
            logger.error(f"Serial read error: {e}")
            if serial_port:
                serial_port.close()
            serial_port = None

# Using lifespan instead of on_event as requested by the deprecation warning
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    database.init_db()
    task = asyncio.create_task(serial_reader_task())
    yield
    # Shutdown
    task.cancel()

app.router.lifespan_context = lifespan

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    global is_reading, current_port_name, current_baud, serial_port
    
    # Send initial status
    await websocket.send_json({
        "type": "status",
        "connected": serial_port is not None and serial_port.is_open,
        "port": current_port_name,
        "baud": current_baud
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                command_data = json.loads(data)
                command = command_data.get("command")
                
                if command == "start":
                    logger.info("Received start command")
                    if serial_port and serial_port.is_open:
                        serial_port.write(b'S')
                        
                elif command == "stop":
                    logger.info("Received stop command")
                    if serial_port and serial_port.is_open:
                        serial_port.write(b'R') # Sending R to reset/home ESP32
                        
                elif command == "reset":
                    logger.info("Received reset command")
                    if serial_port and serial_port.is_open:
                        serial_port.write(b'R')
                        
            except json.JSONDecodeError:
                logger.warning("Received invalid JSON")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket disconnected")

class EmailRequest(BaseModel):
    to_email: str
    subject: str
    message: str
    image_base64: str
    sender_email: str
    sender_password: str

@app.post("/send-email")
async def send_email(request: EmailRequest):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    sender_email = request.sender_email
    sender_password = request.sender_password

    if not sender_email or not sender_password:
        return {"success": False, "error": "Sender credentials must be provided."}

    try:
        msg = EmailMessage()
        msg['Subject'] = request.subject
        msg['From'] = sender_email
        msg['To'] = request.to_email
        msg.set_content(request.message)

        # Remove data URI prefix if present
        if "base64," in request.image_base64:
            img_str = request.image_base64.split("base64,")[1]
        else:
            img_str = request.image_base64

        img_data = base64.b64decode(img_str)
        msg.add_attachment(img_data, maintype='image', subtype='png', filename='lidar_map.png')

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)

        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return {"success": False, "error": str(e)}

# --- Database API Endpoints ---

class SaveMapRequest(BaseModel):
    name: str
    description: str
    snapshot_base64: str
    points: list

@app.post("/api/maps")
async def create_map(request: SaveMapRequest):
    try:
        map_id = database.save_map(
            request.name, 
            request.description, 
            request.snapshot_base64, 
            request.points
        )
        return {"success": True, "map_id": map_id}
    except Exception as e:
        logger.error(f"Failed to save map: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/maps")
async def get_maps():
    maps = database.get_all_maps()
    # Add full URL for snapshots
    for m in maps:
        if m["snapshot_path"]:
            m["snapshot_url"] = f"/media/{m['snapshot_path']}"
    return maps

@app.get("/api/maps/{map_id}")
async def get_map(map_id: int):
    m = database.get_map_by_id(map_id)
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    
    if m["snapshot_path"]:
        m["snapshot_url"] = f"/media/{m['snapshot_path']}"
        
    for a in m.get("artefacts", []):
        if a["media_path"]:
            a["media_url"] = f"/media/{a['media_path']}"
            
    return m

class UpdateMapRequest(BaseModel):
    name: str
    description: str

@app.put("/api/maps/{map_id}")
async def edit_map(map_id: int, request: UpdateMapRequest):
    success = database.update_map(map_id, request.name, request.description)
    if not success:
        raise HTTPException(status_code=404, detail="Map not found")
    return {"success": True}

@app.delete("/api/maps/{map_id}")
async def delete_map(map_id: int):
    success = database.delete_map(map_id)
    if not success:
        raise HTTPException(status_code=404, detail="Map not found")
    return {"success": True}

@app.delete("/api/artefacts/{artefact_id}")
async def delete_artefact(artefact_id: int):
    success = database.delete_artefact(artefact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Artefact not found")
    return {"success": True}

@app.post("/api/maps/{map_id}/artefacts")
async def create_artefact(
    map_id: int,
    header: str = Form(...),
    description: str = Form(""),
    x_pos: float = Form(...),
    y_pos: float = Form(...),
    file: UploadFile = File(...)
):
    try:
        # Save file
        ext = os.path.splitext(file.filename)[1]
        filename = f"artefact_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join("data", "media", filename)
        
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
            
        file_type = "video" if file.content_type.startswith("video/") else "image"
        
        artefact_id = database.save_artefact(
            map_id, header, description, filename, file_type, x_pos, y_pos
        )
        return {"success": True, "artefact_id": artefact_id}
    except Exception as e:
        logger.error(f"Failed to save artefact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8765, reload=False)
