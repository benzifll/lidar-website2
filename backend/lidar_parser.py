import logging

logger = logging.getLogger("LidarParser")

# The ESP32 outputs sample index 0-359 (one per step),
# not degrees — convert: degree = index * (360 / 360) = index
# Distance is in cm — convert to mm for the frontend (* 10)

class LidarParser:
    """
    Parses text-based serial output from the ESP32 TF-Luna scanner.

    Output format:
      SCAN_START
      <index>,<dist_cm>,OK      — valid point
      <index>,-1,ERR            — invalid reading
      SCAN_END,<validPoints>
      [INFO] / [OK] / [ERROR] / [WARN] lines — status messages
    """

    def __init__(self):
        self.buffer = ""
        self.samples_per_rev = 200

    def parse(self, raw_data: bytes):
        """
        Takes raw bytes from serial, decodes to text, parses lines.
        Returns (points, events).
          points: list of {angle, distance, quality}
          events: list of {type, ...}
        """
        try:
            text = raw_data.decode('utf-8', errors='ignore')
            self.buffer += text
        except Exception as e:
            logger.error(f"Decode error: {e}")
            return [], []

        lines = self.buffer.split('\n')
        self.buffer = lines.pop()  # keep incomplete last line

        points = []
        events = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            logger.debug(f"ESP32: {line!r}")

            if line == "SCAN_START":
                events.append({"type": "scan_start"})

            elif line.startswith("SCAN_END"):
                # Format: SCAN_END,<validPoints>
                parts = line.split(",")
                valid = int(parts[1]) if len(parts) > 1 else 0
                events.append({"type": "scan_end", "valid_points": valid})

            elif line and line[0].isdigit():
                # Format: <index>,<dist_cm>,OK|ERR
                parts = line.split(",")
                if len(parts) >= 2:
                    try:
                        sample_index = int(parts[0].strip())
                        dist_cm = int(parts[1].strip())
                        status = parts[2].strip() if len(parts) > 2 else "OK"

                        # Convert index to angle in degrees
                        angle_deg = float(sample_index) * (360.0 / self.samples_per_rev)
                        
                        if status == "OK" and dist_cm > 0:
                            # Convert cm → mm for the frontend
                            dist_mm = float(dist_cm * 10)
                        else:
                            # Send 0 so the frontend overwrites the old point and clears it
                            dist_mm = 0.0

                        points.append({
                            "angle": angle_deg,
                            "distance": dist_mm,
                            "quality": 15 if dist_mm > 0 else 0
                        })
                    except (ValueError, IndexError):
                        pass  # skip malformed lines

            else:
                if "Samples/rev" in line:
                    try:
                        self.samples_per_rev = int(line.split(":")[1].strip())
                    except:
                        pass
                # Status/info/error log line — forward to frontend log
                events.append({"type": "log", "message": line})

        return points, events
