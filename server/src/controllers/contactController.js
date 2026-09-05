import pool from "../config/db.js";

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
        name,
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
    next(error);
  }
};


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