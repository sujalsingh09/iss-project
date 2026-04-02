from flask import Flask, render_template, request, jsonify, redirect, url_for, Blueprint
from flask_login import LoginManager, login_required, current_user
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from models import db, User, ISSPass
from auth import auth_bp, bcrypt
from iss import is_iss_overhead, is_night, send_email, get_iss_position
import os, threading, time

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY']          = os.getenv('SECRET_KEY', 'dev-secret-change-in-prod')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///iss.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
bcrypt.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

app.register_blueprint(auth_bp)

# Per-user monitor state
monitor_states = {}

def get_state(user_id):
    if user_id not in monitor_states:
        monitor_states[user_id] = {
            'running': False,
            'message': 'Not started yet.',
            'last_overhead': None,
            'iss_position': None,
        }
    return monitor_states[user_id]


def monitor_loop(user_id, email, password, lat, lon):
    state = get_state(user_id)
    state['running'] = True
    state['message'] = 'Monitoring started. Checking every 60 seconds...'

    while state['running']:
        try:
            overhead, position = is_iss_overhead(lat, lon)
            state['iss_position'] = position
            night = is_night(lat, lon)

            if overhead and night:
                state['last_overhead'] = position['timestamp']
                send_email(email, password)
                state['message'] = '✅ ISS is overhead and it\'s night! Email sent.'
                with app.app_context():
                    p = ISSPass(
                        user_id=user_id,
                        timestamp=position['timestamp'],
                        latitude=position['latitude'],
                        longitude=position['longitude']
                    )
                    db.session.add(p)
                    db.session.commit()
            elif overhead:
                state['last_overhead'] = position['timestamp']
                state['message'] = '🛸 ISS overhead but daytime. Waiting for night...'
            else:
                state['message'] = '🔭 ISS not overhead. Checking again in 60s...'

        except Exception as e:
            state['message'] = f'❌ Error: {str(e)}'
            state['running'] = False
            break

        time.sleep(60)


# ── Main Blueprint ──────────────────────────────────────────
main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return redirect(url_for('splash'))

@main_bp.route('/dashboard')
@login_required
def dashboard():
    passes = ISSPass.query.filter_by(user_id=current_user.id)\
                          .order_by(ISSPass.created_at.desc())\
                          .limit(20).all()
    return render_template('dashboard.html', user=current_user, passes=passes)

@main_bp.route('/start', methods=['POST'])
@login_required
def start():
    state = get_state(current_user.id)
    if state['running']:
        return jsonify({'message': 'Already monitoring!'}), 400
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''

    try:
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
    except (TypeError, ValueError):
        return jsonify({'message': 'Latitude and longitude must be valid numbers.'}), 400

    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return jsonify({'message': 'Latitude/longitude out of range.'}), 400

    if not email or not password:
        return jsonify({'message': 'Email and app password are required.'}), 400
    thread   = threading.Thread(
        target=monitor_loop,
        args=(current_user.id, email, password, lat, lon),
        daemon=True
    )
    thread.start()
    return jsonify({'message': 'Monitoring started!'})

@main_bp.route('/stop', methods=['POST'])
@login_required
def stop():
    state = get_state(current_user.id)
    state['running'] = False
    state['message'] = 'Monitoring stopped.'
    return jsonify({'message': 'Stopped.'})

@main_bp.route('/status')
@login_required
def status():
    return jsonify(get_state(current_user.id))

@main_bp.route('/iss-position')
def iss_position():
    return jsonify(get_iss_position())

@main_bp.route('/history')
@login_required
def history():
    passes = ISSPass.query.filter_by(user_id=current_user.id)\
                          .order_by(ISSPass.created_at.desc())\
                          .limit(20).all()
    return jsonify([{
        'timestamp': p.timestamp,
        'latitude':  p.latitude,
        'longitude': p.longitude
    } for p in passes])

app.register_blueprint(main_bp)

@app.route('/splash')
def splash():
    return render_template('splash.html')

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    port  = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=debug, port=port)