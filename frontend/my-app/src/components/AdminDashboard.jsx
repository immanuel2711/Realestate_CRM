import React, { useState, useEffect } from "react";
import "./AdminDashboard.css"; // keep your existing styles
import Analytics from "./Analytics";

function Modal({ show, onClose, children }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState("analytics");
  const [agents, setAgents] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({});
  const [assigningLead, setAssigningLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");

  const API_MAP = {
    agents: "https://realestate-crm-cfdg.onrender.com/agents",
    buyers: "https://realestate-crm-cfdg.onrender.com/buyers",
    sellers: "https://realestate-crm-cfdg.onrender.com/sellers",
    leads: "https://realestate-crm-cfdg.onrender.com/leads",
    assignLeadToAgent: (agentId) =>
      `https://realestate-crm-cfdg.onrender.com/agents/${agentId}/assign-lead`,
  };

  const fetchData = async () => {
    try {
      if (currentPage === "agents") {
        const res = await fetch(API_MAP.agents);
        const data = await res.json();
        setAgents(data);
      } else if (currentPage === "buyers") {
        const res = await fetch(API_MAP.buyers);
        const data = await res.json();
        setBuyers(data);
      } else if (currentPage === "sellers") {
        const res = await fetch(API_MAP.sellers);
        const data = await res.json();
        setSellers(data);
      } else if (currentPage === "leads") {
        const res = await fetch(API_MAP.leads);
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(API_MAP.agents);
      const data = await res.json();
      setAgents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch(API_MAP.leads);
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentPage !== "dashboard" && currentPage !== "analytics") {
      fetchData();
      fetchAgents();
      fetchLeads();
    }
  }, [currentPage]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_MAP[currentPage], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({});
        setShowForm(false);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.msg || "Error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`${API_MAP[currentPage]}/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Deleted successfully!");
        setShowModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.msg || "Unable to delete entry");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (entry) => {
    setSelectedEntry(entry);
    setAssigningLead(false);
    setSelectedLeadId("");
    setShowModal(true);
  };

  const assignLeadToAgent = async () => {
    if (!selectedLeadId) return alert("Please select a lead");
    try {
      const res = await fetch(API_MAP.assignLeadToAgent(selectedEntry._id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLeadId }),
      });
      if (res.ok) {
        alert("Lead assigned successfully!");
        setShowModal(false);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.msg || "Error assigning lead");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateLeadStatus = async (leadId, update) => {
    try {
      const res = await fetch(`https://realestate-crm-cfdg.onrender.com/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        fetchLeads();
        fetchAgents();
      } else {
        const data = await res.json();
        alert(data.msg || "Unable to update lead");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateSeller = async (sellerId, update) => {
    try {
      const res = await fetch(`https://realestate-crm-cfdg.onrender.com/sellers/${sellerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        fetchSellers();
      } else {
        const data = await res.json();
        alert(data.msg || "Unable to update seller");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSellers = async () => {
    try {
      const res = await fetch(API_MAP.sellers);
      const data = await res.json();
      setSellers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const renderTable = () => {
    let data = [];
    let headers = [];
    if (currentPage === "agents") {
      data = agents;
      headers = ["ID", "Name", "Email", "Phone", "Assigned Leads"];
    } else if (currentPage === "buyers") {
      data = buyers;
      headers = ["ID", "Location", "Square Feet", "Assigned Agent"];
    } else if (currentPage === "sellers") {
      data = sellers;
      headers = [
        "ID",
        "Location",
        "Square Feet",
        "Value",
        "Type",
        "Beds",
        "Baths",
        "Status",
        "Assigned Agent",
      ];
    } else if (currentPage === "leads") {
      data = leads;
      headers = [
        "ID",
        "Name",
        "Email",
        "Phone",
        "Source",
        "Status",
        "Type",
        "Priority",
        "Assigned Agent",
      ];
    }

    return (
      <table>
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry._id} onClick={() => openModal(entry)}>
              {currentPage === "agents" && (
                <>
                  <td>{entry._id}</td>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td>{entry.phoneNumber || "N/A"}</td>
                  <td>{entry.assignedLeads?.join(", ") || "None"}</td>
                </>
              )}

              {currentPage === "buyers" && (
                <>
                  <td>{entry._id}</td>
                  <td>{entry.interestedLocation}</td>
                  <td>{entry.interestedSquareFeet}</td>
                  <td>{entry.assignedAgent || "None"}</td>
                </>
              )}

              {currentPage === "sellers" && (
                <>
                  <td>{entry._id}</td>
                  <td>{entry.propertyLocation}</td>
                  <td>{entry.propertySquareFeet}</td>
                  <td>{entry.propertyValue || "N/A"}</td>
                  <td>{entry.propertyType || "N/A"}</td>
                  <td>{entry.bedrooms || "-"}</td>
                  <td>{entry.bathrooms || "-"}</td>
                  <td>{entry.listingStatus || "N/A"}</td>
                  <td>{entry.assignedAgent || "None"}</td>
                </>
              )}

              {currentPage === "leads" && (
                <>
                  <td>{entry._id}</td>
                  <td>{entry.name || "N/A"}</td>
                  <td>{entry.email || "N/A"}</td>
                  <td>{entry.phone || "N/A"}</td>
                  <td>{entry.source || "N/A"}</td>
                  <td>{entry.status || "N/A"}</td>
                  <td>{entry.leadType || "N/A"}</td>
                  <td>{entry.priority || "N/A"}</td>
                  <td>{entry.assignedAgent || "None"}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderModalContent = () => {
    if (!selectedEntry) return null;

    if (currentPage === "agents") {
      return (
        <div>
          <h3>Agent Details</h3>
          <p><strong>ID:</strong> {selectedEntry._id}</p>
          <p><strong>Name:</strong> {selectedEntry.name}</p>
          <p><strong>Email:</strong> {selectedEntry.email}</p>
          <p><strong>Phone:</strong> {selectedEntry.phoneNumber || "N/A"}</p>
          <p><strong>Assigned Leads:</strong> {selectedEntry.assignedLeads?.join(", ") || "None"}</p>

          {!assigningLead && (
            <button className="add-entry-btn" onClick={() => setAssigningLead(true)}>Assign a Lead</button>
          )}

          {assigningLead && (
            <div style={{ marginTop: "10px" }}>
              <select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)}>
                <option value="">Select Lead</option>
                {leads.map((l) => (
                  <option key={l._id} value={l._id}>{l.name || l.email || l.phone}</option>
                ))}
              </select>
              <button className="add-entry-btn" style={{ marginLeft: "10px" }} onClick={assignLeadToAgent}>Assign</button>
            </div>
          )}

          <button className="delete-btn" onClick={() => handleDelete(selectedEntry._id)}>Delete Agent</button>
        </div>
      );
    }

    if (currentPage === "buyers") {
      return (
        <div>
          <h3>Buyer Details</h3>
          <p><strong>ID:</strong> {selectedEntry._id}</p>
          <p><strong>Location:</strong> {selectedEntry.interestedLocation}</p>
          <p><strong>Square Feet:</strong> {selectedEntry.interestedSquareFeet}</p>
          <p><strong>Assigned Agent:</strong> {selectedEntry.assignedAgent || "None"}</p>

          <button className="delete-btn" onClick={() => handleDelete(selectedEntry._id)}>Delete Buyer</button>
        </div>
      );
    }

    if (currentPage === "sellers") {
      return (
        <div>
          <h3>Seller Details</h3>
          <p><strong>ID:</strong> {selectedEntry._id}</p>
          <p><strong>Location:</strong> {selectedEntry.propertyLocation}</p>
          <p><strong>Square Feet:</strong> {selectedEntry.propertySquareFeet}</p>
          <p><strong>Value:</strong> {selectedEntry.propertyValue || "N/A"}</p>
          <p><strong>Type:</strong> {selectedEntry.propertyType || "N/A"}</p>
          <p><strong>Bedrooms:</strong> {selectedEntry.bedrooms || "-"}</p>
          <p><strong>Bathrooms:</strong> {selectedEntry.bathrooms || "-"}</p>
          <p><strong>Listing Status:</strong> {selectedEntry.listingStatus || "N/A"}</p>
          <p><strong>Assigned Agent:</strong> {selectedEntry.assignedAgent || "None"}</p>

          <div style={{ marginTop: 12 }}>
            <label>Update Listing Status: </label>
            <select
              defaultValue={selectedEntry.listingStatus || "available"}
              onChange={(e) =>
                updateSeller(selectedEntry._id, { listingStatus: e.target.value })
              }
            >
              <option value="available">available</option>
              <option value="under offer">under offer</option>
              <option value="sold">sold</option>
            </select>
          </div>

          <button className="delete-btn" onClick={() => handleDelete(selectedEntry._id)}>Delete Seller</button>
        </div>
      );
    }

    if (currentPage === "leads") {
      return (
        <div>
          <h3>Lead Details</h3>
          <p><strong>ID:</strong> {selectedEntry._id}</p>
          <p><strong>Name:</strong> {selectedEntry.name || "N/A"}</p>
          <p><strong>Email:</strong> {selectedEntry.email || "N/A"}</p>
          <p><strong>Phone:</strong> {selectedEntry.phone || "N/A"}</p>
          <p><strong>Source:</strong> {selectedEntry.source || "N/A"}</p>
          <p><strong>Status:</strong> {selectedEntry.status || "N/A"}</p>
          <p><strong>Type:</strong> {selectedEntry.leadType || "N/A"}</p>
          <p><strong>Priority:</strong> {selectedEntry.priority || "N/A"}</p>
          <p><strong>Assigned Agent:</strong> {selectedEntry.assignedAgent || "None"}</p>

          <div style={{ marginTop: 12 }}>
            <label>Update Status: </label>
            <select
              defaultValue={selectedEntry.status || "new"}
              onChange={(e) =>
                updateLeadStatus(selectedEntry._id, { status: e.target.value })
              }
            >
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="qualified">qualified</option>
              <option value="closed">closed</option>
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Assign/Change Agent: </label>
            <select
              defaultValue={selectedEntry.assignedAgent || ""}
              onChange={(e) =>
                updateLeadStatus(selectedEntry._id, {
                  assignedAgent: e.target.value,
                })
              }
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <button className="delete-btn" onClick={() => handleDelete(selectedEntry._id)}>Delete Lead</button>
        </div>
      );
    }
  };

  const renderForm = () => {
    if (!showForm) return null;
    if (currentPage === "agents") {
      return (
        <form onSubmit={handleAddEntry}>
          <input type="text" placeholder="Name" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <input type="email" placeholder="Email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <input type="password" placeholder="Password" value={formData.password || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
          <input type="text" placeholder="Phone Number (optional)" value={formData.phoneNumber || ""} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
          <button type="submit" className="add-entry-btn">Add Agent</button>
        </form>
      );
    }

    if (currentPage === "buyers") {
      return (
        <form onSubmit={handleAddEntry}>
          <select value={formData.leadId || ""} onChange={(e) => setFormData({ ...formData, leadId: e.target.value })} required>
            <option value="">Select Lead</option>
            {leads.map((l) => <option key={l._id} value={l._id}>{l.name || l.email || l.phone}</option>)}
          </select>
          <input type="text" placeholder="Interested Location" value={formData.interestedLocation || ""} onChange={(e) => setFormData({ ...formData, interestedLocation: e.target.value })} required />
          <input type="number" placeholder="Square Feet" value={formData.interestedSquareFeet || ""} onChange={(e) => setFormData({ ...formData, interestedSquareFeet: e.target.value })} required />
          <select value={formData.assignedAgent || ""} onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })}>
            <option value="">Assign Agent (optional)</option>
            {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <button type="submit" className="add-entry-btn">Add Buyer</button>
        </form>
      );
    }

    if (currentPage === "sellers") {
      return (
        <form onSubmit={handleAddEntry}>
          <select value={formData.leadId || ""} onChange={(e) => setFormData({ ...formData, leadId: e.target.value })} required>
            <option value="">Select Lead</option>
            {leads.map((l) => <option key={l._id} value={l._id}>{l.name || l.email || l.phone}</option>)}
          </select>

          <input type="text" placeholder="Property Location" value={formData.propertyLocation || ""} onChange={(e) => setFormData({ ...formData, propertyLocation: e.target.value })} required />
          <input type="number" placeholder="Property Square Feet" value={formData.propertySquareFeet || ""} onChange={(e) => setFormData({ ...formData, propertySquareFeet: e.target.value })} required />
          <input type="number" placeholder="Property Value" value={formData.propertyValue || ""} onChange={(e) => setFormData({ ...formData, propertyValue: e.target.value })} required />

          <select value={formData.propertyType || ""} onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}>
            <option value="">Property Type (optional)</option>
            <option value="apartment">apartment</option>
            <option value="villa">villa</option>
            <option value="commercial">commercial</option>
          </select>

          <input type="number" placeholder="Bedrooms (optional)" value={formData.bedrooms || ""} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} />
          <input type="number" placeholder="Bathrooms (optional)" value={formData.bathrooms || ""} onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })} />

          <select value={formData.listingStatus || "available"} onChange={(e) => setFormData({ ...formData, listingStatus: e.target.value })}>
            <option value="available">available</option>
            <option value="under offer">under offer</option>
            <option value="sold">sold</option>
          </select>

          <select value={formData.assignedAgent || ""} onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })}>
            <option value="">Assign Agent (optional)</option>
            {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>

          <button type="submit" className="add-entry-btn">Add Seller</button>
        </form>
      );
    }

    if (currentPage === "leads") {
      return (
        <form onSubmit={handleAddEntry}>
          <input type="text" placeholder="Name (optional)" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <input type="email" placeholder="Email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <input type="text" placeholder="Phone" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <input type="text" placeholder="Source" value={formData.source || ""} onChange={(e) => setFormData({ ...formData, source: e.target.value })} />

          <select value={formData.status || "new"} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="qualified">qualified</option>
            <option value="closed">closed</option>
          </select>

          <select value={formData.leadType || ""} onChange={(e) => setFormData({ ...formData, leadType: e.target.value })}>
            <option value="">Lead Type (optional)</option>
            <option value="buyer">buyer</option>
            <option value="seller">seller</option>
            <option value="both">both</option>
          </select>

          <select value={formData.priority || ""} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
            <option value="">Priority (optional)</option>
            <option value="hot">hot</option>
            <option value="warm">warm</option>
            <option value="cold">cold</option>
          </select>

          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" placeholder="Budget Min" value={(formData.budgetRange && formData.budgetRange.min) || ""} onChange={(e) => setFormData({ ...formData, budgetRange: { ...(formData.budgetRange || {}), min: e.target.value } })} />
            <input type="number" placeholder="Budget Max" value={(formData.budgetRange && formData.budgetRange.max) || ""} onChange={(e) => setFormData({ ...formData, budgetRange: { ...(formData.budgetRange || {}), max: e.target.value } })} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="number" placeholder="Pref Bedrooms" value={(formData.propertyPreferences && formData.propertyPreferences.bedrooms) || ""} onChange={(e) => setFormData({ ...formData, propertyPreferences: { ...(formData.propertyPreferences || {}), bedrooms: e.target.value } })} />
            <input type="number" placeholder="Pref Bathrooms" value={(formData.propertyPreferences && formData.propertyPreferences.bathrooms) || ""} onChange={(e) => setFormData({ ...formData, propertyPreferences: { ...(formData.propertyPreferences || {}), bathrooms: e.target.value } })} />
            <input type="text" placeholder="Pref Location" value={(formData.propertyPreferences && formData.propertyPreferences.location) || ""} onChange={(e) => setFormData({ ...formData, propertyPreferences: { ...(formData.propertyPreferences || {}), location: e.target.value } })} />
          </div>

          <select value={formData.timeline || ""} onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}>
            <option value="">Timeline (optional)</option>
            <option value="immediate">immediate</option>
            <option value="3 months">3 months</option>
            <option value="6 months+">6 months+</option>
          </select>

          <select value={formData.assignedAgent || ""} onChange={(e) => setFormData({ ...formData, assignedAgent: e.target.value })}>
            <option value="">Assign Agent (optional)</option>
            {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>

          <button type="submit" className="add-entry-btn">Add Lead</button>
        </form>
      );
    }
  };

    // (form code unchanged...)
    // keep your full renderForm implementation here
    // I skipped rewriting to save space
    // ✅ still works with delete integration
  

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 id="admin-dashboard">Admin Dashboard</h1>

        <button className="add-entry-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="nav-buttons">
        <button onClick={() => setCurrentPage("leads")}>Leads</button>
        <button onClick={() => setCurrentPage("agents")}>Agents</button>
        <button onClick={() => setCurrentPage("buyers")}>Buyers</button>
        <button onClick={() => setCurrentPage("sellers")}>Sellers</button>
        <button onClick={() => setCurrentPage("analytics")}>Analytics</button>
      </div>

      {currentPage === "analytics" && (
        <div style={{ marginTop: "20px" }}>
          <Analytics />
        </div>
      )}

      {currentPage !== "dashboard" && currentPage !== "analytics" && (
        <div>
          <button
            className="add-entry-btn"
            onClick={() => setShowForm(!showForm)}
            style={{ marginTop: "10px" }}
          >
            {showForm ? "Cancel" : `Add New ${currentPage.slice(0, -1)}`}
          </button>

          {renderForm()}
          {renderTable()}

          <Modal show={showModal} onClose={() => setShowModal(false)}>
            {renderModalContent()}
          </Modal>
        </div>
      )}
    </div>
  );
}
