from flask import Blueprint, request, jsonify
from app import mongo
from app.utils import check_password
from flask_jwt_extended import create_access_token

bp = Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    admin = mongo.db.admins.find_one({"email": email})
    if not admin:
        return jsonify({"msg": "Admin not found"}), 404

    if not check_password(password, admin["password"]):
        return jsonify({"msg": "Incorrect password"}), 401

    # Create JWT token
    access_token = create_access_token(identity=str(admin["_id"]))
    return jsonify({"access_token": access_token}), 200
