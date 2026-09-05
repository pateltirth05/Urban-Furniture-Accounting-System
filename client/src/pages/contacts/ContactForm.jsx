import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API } from "../../services/api";

export default function ContactForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    type: "CUSTOMER",
    email: "",
    mobile: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      API.getContact(id)
        .then((res) => {
          setFormData(res.data.data);
        })
        .catch((err) => {
          setError("Failed to load contact data");
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        await API.updateContact(id, formData);
      } else {
        await API.createContact(formData);
      }
      navigate("/contacts");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pageWorkspace">Loading contact details...</div>;

  return (
    <div className="pageWorkspace">
      <div className="pageCard" style={{ maxWidth: 700, margin: "0 auto" }}>
        <div className="pageHeader">
          <h1 className="pageTitle">{isEdit ? "Edit Contact" : "New Contact"}</h1>
          <button onClick={() => navigate("/contacts")} className="btnSecondary">
            Back to Contacts
          </button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGrid">
            <div className="formGroup">
              <label>Contact Name *</label>
              <input
                type="text"
                name="name"
                required
                className="formControl"
                value={formData.name || ""}
                onChange={handleChange}
                placeholder="e.g. Acme Corporation"
              />
            </div>

            <div className="formGroup">
              <label>Type *</label>
              <select
                name="type"
                className="formControl"
                value={formData.type || "CUSTOMER"}
                onChange={handleChange}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="VENDOR">Vendor</option>
                <option value="BOTH">Both</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                className="formControl"
                value={formData.email || ""}
                onChange={handleChange}
                placeholder="contact@acme.com"
              />
            </div>

            <div className="formGroup">
              <label>Mobile Number</label>
              <input
                type="text"
                name="mobile"
                className="formControl"
                value={formData.mobile || ""}
                onChange={handleChange}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="formGroup" style={{ gridColumn: "1 / -1" }}>
              <label>Street Address</label>
              <input
                type="text"
                name="street"
                className="formControl"
                value={formData.street || ""}
                onChange={handleChange}
                placeholder="123 Commercial Street"
              />
            </div>

            <div className="formGroup">
              <label>City</label>
              <input
                type="text"
                name="city"
                className="formControl"
                value={formData.city || ""}
                onChange={handleChange}
                placeholder="Mumbai"
              />
            </div>

            <div className="formGroup">
              <label>State</label>
              <input
                type="text"
                name="state"
                className="formControl"
                value={formData.state || ""}
                onChange={handleChange}
                placeholder="Maharashtra"
              />
            </div>

            <div className="formGroup">
              <label>Pincode</label>
              <input
                type="text"
                name="pincode"
                className="formControl"
                value={formData.pincode || ""}
                onChange={handleChange}
                placeholder="400001"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/contacts")} className="btnSecondary">
              Cancel
            </button>
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update Contact" : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
