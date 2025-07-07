import pool from '../db.js';

export const createUser = async (full_name, email, password_hash, phone, role, created_at, updated_at) => {
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, phone, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, full_name, email, password_hash, phone, role, created_at, updated_at`,
    [full_name, email, password_hash, phone, role, created_at, updated_at]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};
export const findUserById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};
export const savePasswordResetToken = async (userId, token, expires) => {
  const result = await pool.query(
    `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
    [token, expires, userId]
  );
  return result.rowCount > 0;
};

export const updatePassword = async (userId, hashedPassword) => {
  const result = await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [hashedPassword, userId]
  );
  return result.rowCount > 0;
};

export const clearResetToken = async (userId) => {
  const result = await pool.query(
    `UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1`,
    [userId]
  );
  return result.rowCount > 0;
};