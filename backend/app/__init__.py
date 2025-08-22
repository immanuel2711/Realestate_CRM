from flask import Flask
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET")

mongo = PyMongo(app)
jwt = JWTManager(app)

# Import routes after initializing app
from app.routes import auth
app.register_blueprint(auth.bp)
