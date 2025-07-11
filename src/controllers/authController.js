import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByVerificationToken,
  updatedUserImageProfile,
  updateUserVerification,
  updateUserVerificationToken,
  savePasswordResetToken,
  clearResetToken,
  updatePassword,
  findUserByGoogleId,
  findUserByFacebookId,
  updateUserWithGoogleId,
  updateUserWithFacebookId,
  updateUserProfile,
  findPasswordByUserId
} from '../models/UserModel.js';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail, sendResetPasswordEmail } from '../utils/mailer.js';
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

    const newUser = await createUser({
      full_name: fullName,
      email,
      password_hash: hashedPassword,
      phone,
      role,
      created_at: now,
      updated_at: now
    });

    const JWT_SECRET = process.env.JWT_SECRET;
    const verificationToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    await updateUserVerificationToken(newUser.id, verificationToken);
    await sendVerificationEmail(newUser.email, verificationToken);
    
    res.status(201).json({ 
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name
      }, 
      message: 'Signup successful, please verify your email' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send('Verification token is missing');
  }

  try {
    const user = await findUserByVerificationToken(token);
    if (!user) {
      return res.status(400).send('Invalid or expired verification token');
    }

    if (user.is_verified) {
      return res.status(400).send('Account already verified');
    }

    await updateUserVerification(user.id);
    res.redirect(`${process.env.FRONTEND_URL}/verified`);
  } catch (error) {
    res.status(500).send('Server error during verification');
  }
};

export const signin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ message: 'Please fill in both email and password.' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_verified) {
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
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);
    const user_name = user.full_name
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);

    await savePasswordResetToken(user.id, resetToken, expires);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user.id}`;

    await sendResetPasswordEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Click here to reset your password: ${resetUrl}`,
      user: user_name,
      resetUrl: resetUrl
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
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
    res.status(500).json({ message: 'Server error: ' + error.message });
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

export const getMe = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user,
      message: 'User authenticated'
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadProfileImage = async (req, res) => {
  const filename = req.file?.filename;
  const userId = req.user.id ;

  if (!filename) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  try {
    const updatedUserProfile = await updatedUserImageProfile(userId,filename)
    
    res.json({
      message: 'Profile image uploaded successfully',
      imageUrl: `/${filename}`,
      user: updatedUserProfile,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { fullName, phone, gender, birth_date } = req.body;
    if (!fullName) {
      return res.status(400).json({ message: 'Full Name is required' });
    }
    const updatedUser = await updateUserProfile(userId, { fullName, phone, gender, birth_date });

    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const userPasswordObj = await findPasswordByUserId(userId);

    if (!userPasswordObj || !userPasswordObj.password_hash) {
      return res.status(404).json({ message: 'User password not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userPasswordObj.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await updatePassword(userId, hashedPassword);

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;

    let user = await findUserByGoogleId(googleId);

    if (!user) {
      user = await findUserByEmail(email);

      if (user) {
        user = await updateUserWithGoogleId(user.id, googleId);
      } else {
        const fullName = profile.displayName;
        const phone = profile._json?.phoneNumber || null;

        user = await createUser({
          full_name: fullName,
          email,
          google_id: googleId,
          is_verified: true,
          role: 'attendee',
          phone,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FB_CLIENT_ID,
  clientSecret: process.env.FB_CLIENT_SECRET,
  callbackURL: '/api/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const facebookId = profile.id;
    const email = profile.emails[0].value;

    let user = await findUserByFacebookId(facebookId);

    if (!user) {
      user = await findUserByEmail(email);

      if (user) {
        user = await updateUserWithFacebookId(user.id, facebookId);
      } else {
        user = await createUser({
          full_name: profile.displayName,
          email,
          facebook_id: facebookId,
          is_verified: true,
          role: 'attendee',
          created_at: new Date(),
          updated_at: new Date()
        });
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
    return res.redirect(`${process.env.FRONTEND_URL}/signin?error=authentication_failed`);
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

export const facebookCallback = (req, res) => {
  const user = req.user;
  if (!user) {
    return res.redirect(`${process.env.FRONTEND_URL}/signin?error=authentication_failed`);
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

export { passport };