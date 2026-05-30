import logging

logger = logging.getLogger("LidarParser")

class LidarParser:
    def __init__(self):
        self.buffer = ""
        self.samples_per_rev = 800  # FIX 1: was 200

    def parse(self, raw_data: bytes):
        try:
            text = raw_data.decode('utf-8', errors='ignore')
            self.buffer += text
        except Exception as e:
            logger.error(f"Decode error: {e}")
            return [], []

        lines = self.buffer.split('\n')
        self.buffer = lines.pop()

        points = []
        events = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if line == "SCAN_START":
                events.append({"type": "scan_start"})

            elif line.startswith("SCAN_END"):
                parts = line.split(",")
                valid = int(parts[1]) if len(parts) > 1 else 0
                events.append({"type": "scan_end", "valid_points": valid})

            elif line and (line[0].isdigit() or line[0] == '-'):
                parts = line.split(",")
                if len(parts) >= 2:
                    try:
                        # FIX 2: float instead of int — handles both '45.23' and '45'
                        angle_or_index = float(parts[0].strip())
                        dist_mm        = float(parts[1].strip())
                        status         = parts[2].strip() if len(parts) > 2 else "OK"

                        # If it looks like an index (whole number under 360), convert it
                        if angle_or_index < 360 and angle_or_index == int(angle_or_index):
                            angle_deg = angle_or_index * (360.0 / self.samples_per_rev)
                        else:
                            angle_deg = angle_or_index  # already an angle

                        if status == "OK" and dist_mm > 0:
                            dist_out = dist_mm
                        else:
                            dist_out = 0.0

                        points.append({
                            "angle":    angle_deg,
                            "distance": dist_out,
                            "quality":  15 if dist_out > 0 else 0
                        })
                    except (ValueError, IndexError):
                        pass

            else:
                if "Samples" in line:
                    try:
                        self.samples_per_rev = int(line.split(":")[1].strip())
                    except:
                        pass
                events.append({"type": "log", "message": line})

        return points, events
