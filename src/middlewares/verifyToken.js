import jwt from 'jsonwebtoken';
import { findUserByEmail } from '../models/UserModel.js';

export const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {return res.status(401).json({ message: 'No token provided' });}
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserByEmail(decoded.email);
    if (!user) {return res.status(404).json({ message: 'User not found' });}
    delete user.password_hash;
    req.user = user; 
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
