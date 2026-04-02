from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from flask_bcrypt import Bcrypt
from models import db, User
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

auth_bp = Blueprint('auth', __name__)
bcrypt  = Bcrypt()

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        user     = User.query.filter_by(email=email).first()

        if not user or not user.password_hash:
            flash('Invalid email or password.', 'error')
            return redirect(url_for('auth.login'))

        if not bcrypt.check_password_hash(user.password_hash, password):
            flash('Invalid email or password.', 'error')
            return redirect(url_for('auth.login'))

        login_user(user, remember=True)
        return redirect(url_for('main.dashboard'))

    return render_template('login.html', google_client_id=GOOGLE_CLIENT_ID)


@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name     = request.form.get('name', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        if User.query.filter_by(email=email).first():
            flash('Email already registered.', 'error')
            return redirect(url_for('auth.signup'))

        hashed = bcrypt.generate_password_hash(password).decode('utf-8')
        user   = User(name=name, email=email, password_hash=hashed)
        db.session.add(user)
        db.session.commit()
        login_user(user, remember=True)
        return redirect(url_for('main.dashboard'))

    return render_template('signup.html', google_client_id=GOOGLE_CLIENT_ID)


@auth_bp.route('/google-auth', methods=['POST'])
def google_auth():
    if not GOOGLE_CLIENT_ID:
        return {'error': 'Google login is not configured'}, 503

    payload = request.get_json(silent=True) or {}
    token = payload.get('credential')
    if not token:
        return {'error': 'Missing credential'}, 400

    try:
        info = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception:
        return {'error': 'Invalid token'}, 401

    google_id = info['sub']
    email     = info['email'].lower()
    name      = info.get('name', email.split('@')[0])
    avatar    = info.get('picture', '')

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        user = User.query.filter_by(email=email).first()
        if user:
            user.google_id = google_id
            user.avatar    = avatar
        else:
            user = User(name=name, email=email, google_id=google_id, avatar=avatar)
            db.session.add(user)
        db.session.commit()

    login_user(user, remember=True)
    return {'success': True, 'redirect': url_for('main.dashboard')}


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))