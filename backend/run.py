from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token
from pymongo import MongoClient
import bcrypt
from bson import ObjectId
from datetime import datetime

app = Flask(__name__)
CORS(app)


app.config["JWT_SECRET_KEY"] = "supersecretkey"
jwt = JWTManager(app)

# NOTE: keep your real URI here; this is what you provided originally
MONGO_URI = "mongodb+srv://emmanuelstephen0804:Emman2702@cluster1.edv8roh.mongodb.net/crm_mvp?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client.crm_mvp

# -----------------------
# Auth
# -----------------------
@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "Email and password required"}), 400

    admin = db.admins.find_one({"email": email})
    if not admin:
        return jsonify({"msg": "Admin not found"}), 404

    if not bcrypt.checkpw(password.encode(), admin["password"].encode()):
        return jsonify({"msg": "Incorrect password"}), 401

    access_token = create_access_token(identity=str(admin["_id"]))
    return jsonify({"access_token": access_token}), 200

# -----------------------
# Agents
# -----------------------
@app.route("/agents", methods=["GET"])
def get_agents():
    agents = list(db.agents.find())
    for a in agents:
        # keep original behavior (don't remove fields unexpectedly)
        a["_id"] = str(a["_id"])
        a["assignedLeads"] = [str(lid) for lid in a.get("assignedLeads", [])]
    return jsonify(agents)

@app.route("/agents", methods=["POST"])
def add_agent():
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    phoneNumber = data.get("phoneNumber")

    if not name or not email or not password:
        return jsonify({"msg": "All fields required"}), 400

    if db.agents.find_one({"email": email}):
        return jsonify({"msg": "Agent with this email already exists"}), 400

    hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    agent = {
        "name": name,
        "email": email,
        "password": hashed_pw,
        "role": "agent",
        "phoneNumber": phoneNumber,
        "assignedLeads": [],
        "performanceStats": {
            "totalLeadsHandled": 0,
            "closedDeals": 0,
            "avgResponseTime": None
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    res = db.agents.insert_one(agent)
    agent["_id"] = str(res.inserted_id)
    agent["assignedLeads"] = []

    return jsonify(agent), 201

# Assign a lead to an agent (used by frontend)
@app.route("/agents/<agent_id>/assign-lead", methods=["POST"])
def assign_lead(agent_id):
    data = request.json or {}
    lead_id = data.get("leadId")
    if not lead_id:
        return jsonify({"msg": "leadId is required"}), 400

    try:
        agent_obj_id = ObjectId(agent_id)
        lead_obj_id = ObjectId(lead_id)
    except Exception:
        return jsonify({"msg": "Invalid ID format"}), 400

    agent = db.agents.find_one({"_id": agent_obj_id})
    if not agent:
        return jsonify({"msg": "Agent not found"}), 404

    lead = db.leads.find_one({"_id": lead_obj_id})
    if not lead:
        return jsonify({"msg": "Lead not found"}), 404

    # Check if already assigned to this agent
    if lead.get("assignedAgent") and str(lead.get("assignedAgent")) == agent_id:
        return jsonify({"msg": "Lead already assigned to this agent"}), 400

    prev_assigned = lead.get("assignedAgent")

    # Add lead to agent.assignedLeads (avoid duplicates) and set lead.assignedAgent
    db.agents.update_one(
        {"_id": agent_obj_id},
        {"$addToSet": {"assignedLeads": lead_obj_id}, "$set": {"updatedAt": datetime.utcnow()}}
    )

    db.leads.update_one(
        {"_id": lead_obj_id},
        {"$set": {"assignedAgent": agent_obj_id, "updatedAt": datetime.utcnow()}}
    )

    # If this is a new assignment (lead had no previous agent), increment agent's totalLeadsHandled
    if not prev_assigned:
        db.agents.update_one({"_id": agent_obj_id}, {"$inc": {"performanceStats.totalLeadsHandled": 1}})

    return jsonify({"msg": "Lead assigned successfully"}), 200

# -----------------------
# Leads
# -----------------------
@app.route("/leads", methods=["GET"])
def get_leads():
    leads = list(db.leads.find())
    for l in leads:
        l["_id"] = str(l["_id"])
        l["assignedAgent"] = str(l["assignedAgent"]) if l.get("assignedAgent") else None
        l["buyers"] = [str(bid) for bid in l.get("buyers", [])]
        l["sellers"] = [str(sid) for sid in l.get("sellers", [])]
        for note in l.get("notes", []):
            if isinstance(note.get("createdAt"), datetime):
                note["createdAt"] = note["createdAt"].isoformat()
    return jsonify(leads)

@app.route("/leads", methods=["POST"])
def add_lead():
    data = request.json
    lead = {
        "name": data.get("name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "source": data.get("source"),
        "status": data.get("status"),
        "leadType": data.get("leadType"),  # new optional
        "priority": data.get("priority"),  # new optional
        "budgetRange": data.get("budgetRange"),  # optional, {min, max}
        "propertyPreferences": data.get("propertyPreferences"),  # optional
        "timeline": data.get("timeline"),  # optional
        "assignedAgent": ObjectId(data["assignedAgent"]) if data.get("assignedAgent") else None,
        "buyers": [],
        "sellers": [],
        "notes": [],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    res = db.leads.insert_one(lead)
    lead["_id"] = str(res.inserted_id)
    lead["assignedAgent"] = str(lead["assignedAgent"]) if lead.get("assignedAgent") else None

    # Optional: add this lead to the agent's assignedLeads array
    if data.get("assignedAgent"):
        try:
            db.agents.update_one(
                {"_id": ObjectId(data["assignedAgent"])},
                {"$addToSet": {"assignedLeads": res.inserted_id}}
            )
            # increment totalLeadsHandled because lead was assigned at creation
            db.agents.update_one({"_id": ObjectId(data["assignedAgent"])}, {"$inc": {"performanceStats.totalLeadsHandled": 1}})
        except Exception:
            pass

    return jsonify(lead), 201

# Update lead (partial update)
@app.route("/leads/<lead_id>", methods=["PUT"])
def update_lead(lead_id):
    data = request.json or {}
    try:
        lead_obj_id = ObjectId(lead_id)
    except Exception:
        return jsonify({"msg": "Invalid lead ID"}), 400

    existing = db.leads.find_one({"_id": lead_obj_id})
    if not existing:
        return jsonify({"msg": "Lead not found"}), 404

    update_fields = {}
    allowed = ["name", "email", "phone", "source", "status", "leadType", "priority", "budgetRange", "propertyPreferences", "timeline"]
    for k in allowed:
        if k in data:
            update_fields[k] = data[k]

    # Handle reassignment of agent
    if "assignedAgent" in data:
        new_agent = data.get("assignedAgent")
        if new_agent:
            try:
                new_agent_obj = ObjectId(new_agent)
            except Exception:
                return jsonify({"msg": "Invalid assignedAgent ID"}), 400
            # remove from previous agent if exists
            prev_agent = existing.get("assignedAgent")
            if prev_agent and str(prev_agent) != str(new_agent_obj):
                try:
                    db.agents.update_one({"_id": ObjectId(prev_agent)}, {"$pull": {"assignedLeads": lead_obj_id}})
                except Exception:
                    pass
            # add to new agent's assignedLeads
            db.agents.update_one({"_id": new_agent_obj}, {"$addToSet": {"assignedLeads": lead_obj_id}})
            update_fields["assignedAgent"] = new_agent_obj
        else:
            # unassign
            prev_agent = existing.get("assignedAgent")
            if prev_agent:
                try:
                    db.agents.update_one({"_id": ObjectId(prev_agent)}, {"$pull": {"assignedLeads": lead_obj_id}})
                except Exception:
                    pass
            update_fields["assignedAgent"] = None

    if update_fields:
        update_fields["updatedAt"] = datetime.utcnow()
        db.leads.update_one({"_id": lead_obj_id}, {"$set": update_fields})

    updated = db.leads.find_one({"_id": lead_obj_id})
    updated["_id"] = str(updated["_id"])
    updated["assignedAgent"] = str(updated["assignedAgent"]) if updated.get("assignedAgent") else None
    updated["buyers"] = [str(bid) for bid in updated.get("buyers", [])]
    updated["sellers"] = [str(sid) for sid in updated.get("sellers", [])]

    return jsonify(updated), 200

# -----------------------
# Buyers
# -----------------------
@app.route("/buyers", methods=["GET"])
def get_buyers():
    buyers = list(db.buyers.find())
    for b in buyers:
        b["_id"] = str(b["_id"])
        b["leadId"] = str(b["leadId"]) if b.get("leadId") else None
        b["assignedAgent"] = str(b["assignedAgent"]) if b.get("assignedAgent") else None
    return jsonify(buyers)

@app.route("/buyers", methods=["POST"])
def add_buyer():
    data = request.json
    lead_id = data.get("leadId")
    if not lead_id:
        return jsonify({"msg": "leadId is required"}), 400

    buyer = {
        "leadId": ObjectId(lead_id),
        "interestedLocation": data.get("interestedLocation"),
        "interestedSquareFeet": data.get("interestedSquareFeet"),
        "assignedAgent": ObjectId(data["assignedAgent"]) if data.get("assignedAgent") else None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    res = db.buyers.insert_one(buyer)
    buyer["_id"] = str(res.inserted_id)
    buyer["leadId"] = str(buyer["leadId"])
    buyer["assignedAgent"] = str(buyer["assignedAgent"]) if buyer.get("assignedAgent") else None

    # Update lead's buyers array
    db.leads.update_one({"_id": ObjectId(lead_id)}, {"$push": {"buyers": res.inserted_id}})

    return jsonify(buyer), 201

# -----------------------
# Sellers
# -----------------------
@app.route("/sellers", methods=["GET"])
def get_sellers():
    sellers = list(db.sellers.find())
    for s in sellers:
        s["_id"] = str(s["_id"])
        s["leadId"] = str(s["leadId"]) if s.get("leadId") else None
        s["assignedAgent"] = str(s["assignedAgent"]) if s.get("assignedAgent") else None
    return jsonify(sellers)

@app.route("/sellers", methods=["POST"])
def add_seller():
    data = request.json
    lead_id = data.get("leadId")
    if not lead_id:
        return jsonify({"msg": "leadId is required"}), 400

    seller = {
        "leadId": ObjectId(lead_id),
        "propertyLocation": data.get("propertyLocation"),
        "propertySquareFeet": data.get("propertySquareFeet"),
        "propertyValue": data.get("propertyValue"),
        "propertyType": data.get("propertyType"),  # new
        "bedrooms": data.get("bedrooms"),  # new
        "bathrooms": data.get("bathrooms"),  # new
        "listingStatus": data.get("listingStatus", "available"),  # default to available
        "assignedAgent": ObjectId(data["assignedAgent"]) if data.get("assignedAgent") else None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    res = db.sellers.insert_one(seller)

    # Convert ObjectId to string for response
    seller["_id"] = str(res.inserted_id)
    seller["leadId"] = str(seller["leadId"])
    seller["assignedAgent"] = str(seller["assignedAgent"]) if seller.get("assignedAgent") else None

    # Update lead's sellers array with seller object (including new fields)
    db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$push": {"sellers": {
            "_id": res.inserted_id,
            "propertyLocation": seller["propertyLocation"],
            "propertySquareFeet": seller["propertySquareFeet"],
            "propertyValue": seller["propertyValue"],
            "propertyType": seller["propertyType"],
            "bedrooms": seller["bedrooms"],
            "bathrooms": seller["bathrooms"],
            "listingStatus": seller["listingStatus"],
            "assignedAgent": seller["assignedAgent"],
            "createdAt": seller["createdAt"],
            "updatedAt": seller["updatedAt"]
        }}}
    )

    return jsonify(seller), 201

# Update seller (partial update)
@app.route("/sellers/<seller_id>", methods=["PUT"])
def update_seller(seller_id):
    data = request.json or {}
    try:
        seller_obj_id = ObjectId(seller_id)
    except Exception:
        return jsonify({"msg": "Invalid seller ID"}), 400

    existing = db.sellers.find_one({"_id": seller_obj_id})
    if not existing:
        return jsonify({"msg": "Seller not found"}), 404

    update_fields = {}
    allowed = ["propertyLocation", "propertySquareFeet", "propertyValue", "propertyType", "bedrooms", "bathrooms", "listingStatus", "assignedAgent"]
    for k in allowed:
        if k in data:
            if k == "assignedAgent":
                update_fields[k] = ObjectId(data[k]) if data[k] else None
            else:
                update_fields[k] = data[k]

    if update_fields:
        update_fields["updatedAt"] = datetime.utcnow()
        db.sellers.update_one({"_id": seller_obj_id}, {"$set": update_fields})

    updated = db.sellers.find_one({"_id": seller_obj_id})
    updated["_id"] = str(updated["_id"])
    updated["leadId"] = str(updated["leadId"]) if updated.get("leadId") else None
    updated["assignedAgent"] = str(updated["assignedAgent"]) if updated.get("assignedAgent") else None

    return jsonify(updated), 200

# -----------------------
# Analytics
# -----------------------
@app.route("/analytics/top-locations", methods=["GET"])
def top_locations():
    # Find top interested location among buyers
    buyer_pipeline = [
        {"$group": {"_id": "$interestedLocation", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}  # only top 1
    ]
    top_buyer = list(db.buyers.aggregate(buyer_pipeline))

    # Find top property location among sellers
    seller_pipeline = [
        {"$group": {"_id": "$propertyLocation", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}  # only top 1
    ]
    top_seller = list(db.sellers.aggregate(seller_pipeline))

    response = {}

    if top_buyer:
        response["topBuyerLocation"] = {
            "city": top_buyer[0]["_id"] or "Unknown",
            "count": top_buyer[0]["count"],
            "message": f"🔥 Most buyers are interested in {top_buyer[0]['_id']} ({top_buyer[0]['count']} inquiries)"
        }
    else:
        response["topBuyerLocation"] = {"message": "No buyer data available"}

    if top_seller:
        response["topSellerLocation"] = {
            "city": top_seller[0]["_id"] or "Unknown",
            "count": top_seller[0]["count"],
            "message": f"🌟 Most properties are listed in {top_seller[0]['_id']} ({top_seller[0]['count']} listings)"
        }
    else:
        response["topSellerLocation"] = {"message": "No seller data available"}

    return jsonify(response), 200

@app.route("/analytics/average-property-values", methods=["GET"])
def average_property_values():
    pipeline = [
        {
            "$addFields": {
                "propertyValueNum": { "$toDouble": "$propertyValue" }
            }
        },
        {
            "$group": {
                "_id": "$propertyLocation",
                "avgValue": {"$avg": "$propertyValueNum"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"avgValue": -1}}
    ]

    results = list(db.sellers.aggregate(pipeline))

    response = [
        {
            "city": r["_id"] or "Unknown",
            "avgValue": round(r["avgValue"], 2) if r.get("avgValue") else 0,
            "count": r["count"]
        }
        for r in results
    ]

    return jsonify(response), 200
# -----------------------
# Extra Analytics
# -----------------------

# Leads Pipeline: count leads by status, source, and priority
@app.route("/analytics/leads-pipeline", methods=["GET"])
def leads_pipeline():
    status_counts = list(db.leads.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]))
    source_counts = list(db.leads.aggregate([
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]))
    priority_counts = list(db.leads.aggregate([
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]))

    return jsonify({
        "statusCounts": {s["_id"] or "Unknown": s["count"] for s in status_counts},
        "sourceCounts": {s["_id"] or "Unknown": s["count"] for s in source_counts},
        "priorityCounts": {p["_id"] or "Unspecified": p["count"] for p in priority_counts}
    }), 200


# Buyer Insights: property size ranges + new buyers per month
@app.route("/analytics/buyer-insights", methods=["GET"])
def buyer_insights():
    # Interested square feet distribution
    size_distribution = list(db.buyers.aggregate([
        {"$bucket": {
            "groupBy": "$interestedSquareFeet",
            "boundaries": [0, 500, 1000, 2000, 5000, 10000],
            "default": "10000+",
            "output": {"count": {"$sum": 1}}
        }}
    ]))

    # Buyers created per month
    buyers_timeline = list(db.buyers.aggregate([
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$createdAt"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]))

    return jsonify({
        "sizeDistribution": size_distribution,
        "buyersTimeline": buyers_timeline
    }), 200


# Seller Insights: property type distribution + status breakdown + avg beds/baths
@app.route("/analytics/seller-insights", methods=["GET"])
def seller_insights():
    property_types = list(db.sellers.aggregate([
        {"$group": {"_id": "$propertyType", "count": {"$sum": 1}}}
    ]))
    listing_status = list(db.sellers.aggregate([
        {"$group": {"_id": "$listingStatus", "count": {"$sum": 1}}}
    ]))
    avg_beds_baths = list(db.sellers.aggregate([
        {"$group": {
            "_id": "$propertyLocation",
            "avgBedrooms": {"$avg": "$bedrooms"},
            "avgBathrooms": {"$avg": "$bathrooms"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]))

    return jsonify({
        "propertyTypes": {pt["_id"] or "Unknown": pt["count"] for pt in property_types},
        "listingStatus": {ls["_id"] or "Unknown": ls["count"] for ls in listing_status},
        "avgBedsBaths": [
            {
                "city": ab["_id"] or "Unknown",
                "avgBedrooms": round(ab["avgBedrooms"], 1) if ab.get("avgBedrooms") else 0,
                "avgBathrooms": round(ab["avgBathrooms"], 1) if ab.get("avgBathrooms") else 0,
                "count": ab["count"]
            }
            for ab in avg_beds_baths
        ]
    }), 200


# Demand vs Supply: compare buyers vs sellers per city
@app.route("/analytics/market-demand-vs-supply", methods=["GET"])
def market_demand_vs_supply():
    buyer_counts = list(db.buyers.aggregate([
        {"$group": {"_id": "$interestedLocation", "count": {"$sum": 1}}}
    ]))
    seller_counts = list(db.sellers.aggregate([
        {"$group": {"_id": "$propertyLocation", "count": {"$sum": 1}}}
    ]))

    demand_supply = {}
    for b in buyer_counts:
        demand_supply[b["_id"] or "Unknown"] = {"buyers": b["count"], "sellers": 0}
    for s in seller_counts:
        city = s["_id"] or "Unknown"
        if city not in demand_supply:
            demand_supply[city] = {"buyers": 0, "sellers": s["count"]}
        else:
            demand_supply[city]["sellers"] = s["count"]

    return jsonify(demand_supply), 200


# Market Value: total property value by city + top 5 most valuable listings
@app.route("/analytics/market-value", methods=["GET"])
def market_value():
    pipeline = [
        {
            "$addFields": {"propertyValueNum": {"$toDouble": "$propertyValue"}}
        },
        {
            "$group": {
                "_id": "$propertyLocation",
                "totalValue": {"$sum": "$propertyValueNum"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"totalValue": -1}}
    ]
    total_by_city = list(db.sellers.aggregate(pipeline))

    top_listings = list(db.sellers.aggregate([
        {"$addFields": {"propertyValueNum": {"$toDouble": "$propertyValue"}}},
        {"$sort": {"propertyValueNum": -1}},
        {"$limit": 5}
    ]))

    response = {
        "totalByCity": [
            {
                "city": r["_id"] or "Unknown",
                "totalValue": round(r["totalValue"], 2),
                "count": r["count"]
            }
            for r in total_by_city
        ],
        "topListings": [
            {
                "_id": str(l["_id"]),
                "propertyLocation": l.get("propertyLocation", "Unknown"),
                "propertyValue": l.get("propertyValue"),
                "propertyType": l.get("propertyType"),
                "bedrooms": l.get("bedrooms"),
                "bathrooms": l.get("bathrooms")
            }
            for l in top_listings
        ]
    }

    return jsonify(response), 200

# -----------------------
# Conversion Rate
# -----------------------
@app.route("/analytics/conversion-rate", methods=["GET"])
def conversion_rate():
    total_leads = db.leads.count_documents({})
    completed_leads = db.leads.count_documents({"status": "closed"})

    if total_leads == 0:
        rate = 0
    else:
        rate = round((completed_leads / total_leads) * 100, 2)

    return jsonify({
        "totalLeads": total_leads,
        "completedLeads": completed_leads,
        "conversionRate": rate  # percentage
    }), 200
# -----------------------
# Delete Lead
# -----------------------
@app.route("/leads/<lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    try:
        lead_obj_id = ObjectId(lead_id)
    except Exception:
        return jsonify({"msg": "Invalid lead ID"}), 400

    lead = db.leads.find_one({"_id": lead_obj_id})
    if not lead:
        return jsonify({"msg": "Lead not found"}), 404

    # Remove lead ID from assigned agent's assignedLeads array, if assigned
    assigned_agent = lead.get("assignedAgent")
    if assigned_agent:
        db.agents.update_one(
            {"_id": assigned_agent},
            {"$pull": {"assignedLeads": lead_obj_id}}
        )

    # Optionally: remove this lead's ID from buyers and sellers if you want cascading delete
    db.buyers.delete_many({"leadId": lead_obj_id})
    db.sellers.delete_many({"leadId": lead_obj_id})

    # Finally, delete the lead
    db.leads.delete_one({"_id": lead_obj_id})

    return jsonify({"msg": "Lead deleted successfully"}), 200

# -----------------------
# Delete Seller
# -----------------------
@app.route("/sellers/<seller_id>", methods=["DELETE"])
def delete_seller(seller_id):
    try:
        seller_obj_id = ObjectId(seller_id)
    except Exception:
        return jsonify({"msg": "Invalid seller ID"}), 400

    seller = db.sellers.find_one({"_id": seller_obj_id})
    if not seller:
        return jsonify({"msg": "Seller not found"}), 404

    # Remove seller from lead's sellers array
    lead_id = seller.get("leadId")
    if lead_id:
        db.leads.update_one(
            {"_id": lead_id},
            {"$pull": {"sellers": {"_id": seller_obj_id}}}
        )

    # Finally, delete the seller
    db.sellers.delete_one({"_id": seller_obj_id})

    return jsonify({"msg": "Seller deleted successfully"}), 200
@app.route("/agents/<agent_id>", methods=["DELETE"])
def delete_agent(agent_id):
    try:
        agent_obj_id = ObjectId(agent_id)
    except Exception:
        return jsonify({"msg": "Invalid agent ID"}), 400

    agent = db.agents.find_one({"_id": agent_obj_id})
    if not agent:
        return jsonify({"msg": "Agent not found"}), 404

    # Remove assigned leads
    db.leads.update_many(
        {"assignedAgent": agent_obj_id},
        {"$set": {"assignedAgent": None}}
    )

    # Finally, delete the agent
    db.agents.delete_one({"_id": agent_obj_id})

    return jsonify({"msg": "Agent deleted successfully"}), 200
@app.route("/buyers/<buyer_id>", methods=["DELETE"])
def delete_buyer(buyer_id):
    try:
        buyer_obj_id = ObjectId(buyer_id)
    except Exception:
        return jsonify({"msg": "Invalid buyer ID"}), 400

    buyer = db.buyers.find_one({"_id": buyer_obj_id})
    if not buyer:
        return jsonify({"msg": "Buyer not found"}), 404

    lead_id = buyer.get("leadId")
    if lead_id:
        # Remove buyer reference from lead
        db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$pull": {"buyers": buyer_obj_id}}
        )

    # Finally, delete the buyer
    db.buyers.delete_one({"_id": buyer_obj_id})

    return jsonify({"msg": "Buyer deleted successfully"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
