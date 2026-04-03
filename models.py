from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(120), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=True)  # null for SSO users
    avatar        = db.Column(db.String(500), nullable=True)
    google_id     = db.Column(db.String(120), unique=True, nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    passes        = db.relationship('ISSPass', backref='user', lazy=True)

class ISSPass(db.Model):
    __tablename__ = 'iss_passes'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timestamp  = db.Column(db.String(30), nullable=False)
    latitude   = db.Column(db.Float, nullable=False)
    longitude  = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)