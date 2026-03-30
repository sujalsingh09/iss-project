# 🛸 ISS Overhead Notifier

A Python app that tracks the **International Space Station (ISS)** in real-time and sends you an **email alert** when it's passing over your location — so you can step outside and spot it with your own eyes!

---

## 🌟 Features

- 📡 Fetches live ISS position using the [Open Notify API](http://api.open-notify.org/)
- 📍 Compares ISS coordinates with your location
- 🌙 Checks if it's dark enough outside to see the ISS
- 📧 Sends an email notification when ISS is overhead at night
- 🔁 Runs automatically every 60 seconds

---

## 🚀 How It Works

1. Gets the current latitude & longitude of the ISS
2. Checks if the ISS is within **±5 degrees** of your location
3. Checks if it's currently **nighttime** at your location (via Sunrise-Sunset API)
4. If both conditions are met → sends you an email saying **"Look up! 👆"**
5. Repeats every **60 seconds**

---

## 🛠️ Setup

### 1. Clone the repository
```bash
git clone https://github.com/sujalsingh09/iss-project.git
cd iss-project
```

### 2. Install dependencies
```bash
pip install requests
```

### 3. Configure your details
Open `main.py` and update these variables:
```python
MY_LAT = 28.6139        # Your latitude
MY_LONG = 77.2090       # Your longitude

MY_EMAIL = "your@email.com"
MY_PASSWORD = "your_app_password"
TO_EMAIL = "notify@email.com"
```

> ⚠️ **Use a Gmail App Password**, not your actual Gmail password.
> Generate one at: **Google Account → Security → 2-Step Verification → App Passwords**

---

## ▶️ Run the Script

```bash
python main.py
```

> The script will keep running and check every **60 seconds** in a loop.

---

## 📦 APIs Used

| API | Purpose |
|-----|---------|
| [Open Notify](http://api.open-notify.org/iss-now.json) | Live ISS position |
| [Sunrise Sunset](https://api.sunrise-sunset.org/json) | Check if it's nighttime |

---

## 📋 Requirements

- Python 3.x
- `requests` library
- Gmail account with **App Password** enabled

---

## 📸 Sample Email Alert

```
Subject: Look Up 👆
Body: The ISS is above you! Go outside and look up at the sky.
```

---

## 🔒 Security Note

Never hardcode credentials in production. Use environment variables instead:

```python
import os
MY_EMAIL = os.environ.get("MY_EMAIL")
MY_PASSWORD = os.environ.get("MY_PASSWORD")
```

Set them in your terminal:
```bash
# Windows
set MY_EMAIL=your@email.com
set MY_PASSWORD=your_app_password

# Mac/Linux
export MY_EMAIL=your@email.com
export MY_PASSWORD=your_app_password
```

---

## 📄 License

MIT License — free to use and modify.

---

Made with ❤️ by [sujalsingh09](https://github.com/sujalsingh09)
