import requests
from datetime import datetime
import smtplib


def get_iss_position():
    response = requests.get(url="http://api.open-notify.org/iss-now.json")
    response.raise_for_status()
    data = response.json()
    return {
        "latitude": float(data["iss_position"]["latitude"]),
        "longitude": float(data["iss_position"]["longitude"]),
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
    response = requests.get("https://api.sunrise-sunset.org/json", params=parameters)
    response.raise_for_status()
    data = response.json()

    sunrise = int(data["results"]["sunrise"].split("T")[1].split(":")[0])
    sunset = int(data["results"]["sunset"].split("T")[1].split(":")[0])
    time_now = datetime.now().hour

    if time_now >= sunset or time_now <= sunrise:
        return True
    return False


def send_email(my_email, my_password):
    connection = smtplib.SMTP("smtp.gmail.com", 587)
    connection.starttls()
    connection.login(my_email, my_password)
    connection.sendmail(
        from_addr=my_email,
        to_addrs=my_email,
        msg="Subject:Look Up👆\n\nThe ISS is above you in the sky."
    )
    connection.close()