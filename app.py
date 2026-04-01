from flask import Flask, render_template, request, jsonify
from iss import is_iss_overhead, is_night, send_email, get_iss_position
from dotenv import load_dotenv
import os
import threading
import time

load_dotenv()

app = Flask(__name__)

monitor_status = {
    "running": False,
    "message": "Not started yet.",
    "last_overhead": None,
    "iss_position": None,
}


def monitor_loop(email, password, lat, lon):
    monitor_status["running"] = True
    monitor_status["message"] = "Monitoring started. Checking every 60 seconds..."

    while monitor_status["running"]:
        try:
            overhead, position = is_iss_overhead(lat, lon)
            monitor_status["iss_position"] = position

            night = is_night(lat, lon)

            if overhead and night:
                monitor_status["last_overhead"] = position["timestamp"]
                send_email(email, password)
                monitor_status["message"] = "✅ ISS is overhead and it's night! Email sent."
            elif overhead:
                monitor_status["last_overhead"] = position["timestamp"]
                monitor_status["message"] = "🛸 ISS is overhead but it's daytime. Waiting for night..."
            else:
                monitor_status["message"] = "🔭 ISS is not overhead. Checking again in 60s..."

        except Exception as e:
            monitor_status["message"] = f"❌ Error: {str(e)}"
            monitor_status["running"] = False
            break

        time.sleep(60)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/start", methods=["POST"])
def start():
    if monitor_status["running"]:
        return jsonify({"message": "Already monitoring!"}), 400

    data = request.json
    email = data.get("email")
    password = data.get("password")
    lat = float(data.get("lat"))
    lon = float(data.get("lon"))

    thread = threading.Thread(target=monitor_loop, args=(email, password, lat, lon), daemon=True)
    thread.start()

    return jsonify({"message": "Monitoring started!"})


@app.route("/stop", methods=["POST"])
def stop():
    monitor_status["running"] = False
    monitor_status["message"] = "Monitoring stopped."
    return jsonify({"message": "Stopped."})


@app.route("/status")
def status():
    return jsonify(monitor_status)


@app.route("/iss-position")
def iss_position():
    position = get_iss_position()
    return jsonify(position)


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "False") == "True"
    port = int(os.getenv("FLASK_PORT", 5000))
    app.run(debug=debug, port=port)