import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createUser, findUserByEmail ,savePasswordResetToken , clearResetToken ,updatePassword,findUserById} from '../models/UserModel.js';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { sendVerificationEmail , sendResetPasswordEmail } from '../utils/mailer.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import dotenv from 'dotenv';

dotenv.config();

export const signup = async (req, res) => {
  const { fullName, email, password, phone, role } = req.body;
  try {
    if (!fullName || !email || !password || !phone || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const newUser = await createUser(fullName, email, hashedPassword, phone, role, now, now);
    const JWT_SECRET = process.env.JWT_SECRET;
    const verificationToken = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '1d' }
        );
    await pool.query('UPDATE users SET verification_token = $1 WHERE id = $2', [verificationToken, newUser.id]);
    await sendVerificationEmail(newUser.email, verificationToken);
    res.status(201).json({ user: newUser, message: 'Signup successful, please verify your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error'+error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send('Verification token is missing');
  }
  try {
    const result = await pool.query(
      'SELECT id, is_verified FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('Invalid or expired verification token');
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).send('Account already verified');
    }

    await pool.query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1',
      [user.id]
    );
    res.redirect(`${process.env.FRONTEND_URL}/verified`); 
  } catch (error) {
    res.status(500).send('Server error');
  }
};

export const signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

   if( !user.is_verified) {
      return res.status(403).json({ message: 'Please verify your email before signing in' });
    }

    const payload = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
     res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    res.status(200).json({
      message: 'Sign-in successful',
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error'+err.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); 

    await savePasswordResetToken(user.id, resetToken, expires);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user.id}`;
   
    await sendResetPasswordEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Click here to reset your password: ${resetUrl}`,
      user:user,
      resetUrl: resetUrl
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  const { userId, token, newPassword } = req.body;

  try {
    const user = await findUserById(userId);

    if (!user || user.password_reset_token !== token) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (new Date() > new Date(user.password_reset_expires)) {
      return res.status(400).json({ message: 'Token expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await updatePassword(userId, hashedPassword);
    await clearResetToken(userId);

    res.status(200).json({ message: 'Password successfully reset' });
  } catch (error) {
    res.status(500).json({ message: 'Server error'+error.message });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  res.status(200).json({
    user: req.user,
    message: 'User authenticated'
  });
};

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;

    let resUser = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user = resUser.rows[0];

    if (!user) {
      resUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      user = resUser.rows[0];

      if (user) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
      } else {
      const fullName = profile.displayName;
      const phone = profile._json?.phoneNumber || null;

       const insertRes = await pool.query(
        `INSERT INTO users (email, full_name, google_id, is_verified, role, phone) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [email, fullName, googleId, true, 'attendee', phone]
      );

        user = insertRes.rows[0];
      }
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

export const googleAuthCallback = (req, res) => {
  const user = req.user;
  if (!user) {
    return res.redirect(`${process.env.FRONTEND_URL}/signin`);
  }

  const payload = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });

  res.redirect(`${process.env.FRONTEND_URL}`);
};

passport.use(new FacebookStrategy({
  clientID: process.env.FB_CLIENT_ID,
  clientSecret: process.env.FB_CLIENT_SECRET,
  callbackURL: '/api/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const facebookId = profile.id;
    const email = profile.emails[0].value;

    let resUser = await pool.query('SELECT * FROM users WHERE facebook_id = $1', [facebookId]);
    let user = resUser.rows[0];

    if (!user) {
      resUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      user = resUser.rows[0];

      if (user) {
        await pool.query('UPDATE users SET facebook_id = $1 WHERE id = $2', [facebookId, user.id]);
      } else {
        const insertRes = await pool.query(
          'INSERT INTO users (email, full_name, facebook_id, is_verified) VALUES ($1, $2, $3, $4) RETURNING *',
          [email, profile.displayName, facebookId, true]
        );
        user = insertRes.rows[0];
      }
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

export const facebookCallback = (req, res) => {
   const user = req.user;
  const payload = {
    id: req.user.id,
    fullName: user.full_name,
    email: req.user.email,
    role: req.user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });

  res.redirect(`${process.env.FRONTEND_URL}`);
};

export { passport };