import pool from "../config/db.js";

// CREATE CONTACT
export const createContact = async (req, res, next) => {
  try {
    const {
      name,
      type,
      email,
      mobile,
      street,
      city,
      state,
      pincode,
      profileImage,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and contact type are required",
      });
    }

    const validTypes = ["CUSTOMER", "VENDOR", "BOTH"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be CUSTOMER, VENDOR, or BOTH",
      });
    }

    const result = await pool.query(
      `INSERT INTO contacts
      (
        name,
        type,
        email,
        mobile,
        street,
        city,
        state,
        pincode,
        profile_image
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        name.trim(),
        type,
        email || null,
        mobile || null,
        street || null,
        city || null,
        state || null,
        pincode || null,
        profileImage || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A contact with this email already exists",
      });
    }

    next(error);
  }
};

// GET ALL ACTIVE CONTACTS
export const getContacts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM contacts
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET CONTACT BY ID
export const getContactById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM contacts
       WHERE id = $1
       AND is_active = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE CONTACT
export const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      type,
      email,
      mobile,
      street,
      city,
      state,
      pincode,
      profileImage,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and contact type are required",
      });
    }

    const validTypes = ["CUSTOMER", "VENDOR", "BOTH"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be CUSTOMER, VENDOR, or BOTH",
      });
    }

    const result = await pool.query(
      `UPDATE contacts
       SET
         name = $1,
         type = $2,
         email = $3,
         mobile = $4,
         street = $5,
         city = $6,
         state = $7,
         pincode = $8,
         profile_image = $9
       WHERE id = $10
       AND is_active = TRUE
       RETURNING *`,
      [
        name.trim(),
        type,
        email || null,
        mobile || null,
        street || null,
        city || null,
        state || null,
        pincode || null,
        profileImage || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A contact with this email already exists",
      });
    }

    next(error);
  }
};

// ARCHIVE CONTACT
export const archiveContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE contacts
       SET is_active = FALSE
       WHERE id = $1
       AND is_active = TRUE
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact archived successfully",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};