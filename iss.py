import requests
from datetime import datetime, timezone
import smtplib

REQUEST_TIMEOUT_SECONDS = 10


def get_iss_position():
    response = requests.get(
        url="https://api.wheretheiss.at/v1/satellites/25544", 
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    data = response.json()
    return {
        "latitude":  float(data["latitude"]),  
        "longitude": float(data["longitude"]),   
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


def is_iss_overhead(lat, lon):
    position = get_iss_position()
    iss_lat = position["latitude"]
    iss_lon = position["longitude"]

    if lat - 5 <= iss_lat <= lat + 5 and lon - 5 <= iss_lon <= lon + 5:
        return True, position
    return False, position


def is_night(lat, lon):
    parameters = {
        "lat": lat,
        "lng": lon,
        "formatted": 0,
    }
    response = requests.get(
        "https://api.sunrise-sunset.org/json",
        params=parameters,
        timeout=REQUEST_TIMEOUT_SECONDS
    )
    response.raise_for_status()
    data = response.json()
    if data.get("status") != "OK":
        raise ValueError("Unable to fetch sunrise/sunset data")

    sunrise = datetime.fromisoformat(data["results"]["sunrise"].replace("Z", "+00:00"))
    sunset = datetime.fromisoformat(data["results"]["sunset"].replace("Z", "+00:00"))
    time_now = datetime.now(timezone.utc)

    if time_now >= sunset or time_now <= sunrise:
        return True
    return False


def send_email(my_email, my_password):
    with smtplib.SMTP("smtp.gmail.com", 587) as connection:
        connection.starttls()
        connection.login(my_email, my_password)
        connection.sendmail(
            from_addr=my_email,
            to_addrs=my_email,
            msg="Subject:Look Up\n\nThe ISS is above you in the sky."
        )