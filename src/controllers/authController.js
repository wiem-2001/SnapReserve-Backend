/* eslint-disable no-useless-escape */
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
  findPasswordByUserId,
  deleteUserById,
  getKnownDevicesByUserId,
  createSuspiciousLogin,
  createKnownDevice,
  getDevicesByUserId,
  updateWelcomeGiftExpiry
} from '../models/UserModel.js';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail, sendResetPasswordEmail } from '../utils/mailer.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import dotenv from 'dotenv';
import { saveNotification } from '../controllers/notificationController.js';
import { UAParser } from 'ua-parser-js';
import { ticketcountByEventOwnerId } from "../models/TicketModel.js"
import { differenceInDays } from 'date-fns';
import { createUserPoints } from '../models/pointsModel.js';
dotenv.config();

function parseDeviceName(userAgent) {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser().name || 'Unknown Browser';
  const os = parser.getOS().name || 'Unknown OS';
  return `${browser} on ${os}`;
}

const STALE_DEVICE_THRESHOLD_DAYS = 30;

export async function checkAndLogDevice(req, userId) {
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const allDevices = await getKnownDevicesByUserId(userId); 
  const matchingDevices = allDevices.filter(d => d.device === userAgent);
  const deviceName = parseDeviceName(userAgent);

  if (!allDevices || allDevices.length === 0) {
    await createKnownDevice(userId, userAgent);
    return;
  }

  if (!matchingDevices || matchingDevices.length === 0) {
    await createKnownDevice(userId, userAgent);
    await createSuspiciousLogin(userId, userAgent);
    await saveNotification(
      userId,
      `New device detected: ${deviceName}. If this wasn't you, please secure your account.`
    );
  } else {
    const hasRecentlyUsedDevice = matchingDevices.some(device => {
      const daysSinceLastUse = differenceInDays(new Date(), new Date(device.lastUsed));
      return daysSinceLastUse <= STALE_DEVICE_THRESHOLD_DAYS;
    });

    if (hasRecentlyUsedDevice) {
      await createKnownDevice(userId, userAgent);
    } else {
      await createKnownDevice(userId, userAgent);
      await createSuspiciousLogin(userId, userAgent);
      await saveNotification(
        userId,
        `Previously used device detected after more than ${STALE_DEVICE_THRESHOLD_DAYS} days: ${deviceName}. If this wasn't you, please secure your account.`
      );
    }
  }
}

export const signup = async (req, res) => {
  const { fullName, email, password, phone, role ,birth_date,gender} = req.body;
  try {
    if (!fullName || !email || !password || !phone || !role || !birth_date ||!gender) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already in use' });
    }

    const birthDateObj = new Date(birth_date);
    if (isNaN(birthDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid birth date format' });
    }

    const currentYear = new Date().getFullYear();
    const birthYear = birthDateObj.getFullYear();

    if (currentYear - birthYear < 13) {
      return res.status(400).json({ message: 'You must be at least 13 years old to sign up.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const newUser = await createUser({
      full_name: fullName,
      email,
      password_hash: hashedPassword,
      phone,
      role,
      birth_date,
      gender,
      created_at: now,
      updated_at: now
    });
    await createUserPoints(newUser.id);

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
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.redirect(
          `${process.env.FRONTEND_URL}/verify-expired?email=${encodeURIComponent(decoded?.email || '')}`
        );
      } else {
        return res.redirect(`${process.env.FRONTEND_URL}/verify-expired?message=Invalid verification token`);
      }
    }
    const user = await findUserByVerificationToken(token);
    if (user.is_verified) {
      return res.redirect(`${process.env.FRONTEND_URL}/verified`);
    }

    if (decoded.userId !== user.id) {
      return res.redirect(`${process.env.FRONTEND_URL}/verify-expired?message=Token does not match user`);
    }

    await updateUserVerification(user.id);
    
    res.redirect(`${process.env.FRONTEND_URL}/verified`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/verify-expired?message=Server error during verification`);
  }
};

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false,
      message: 'Email is required' 
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Please provide a valid email address' 
    });
  }

  try {
    const user = await findUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'No account found with this email address' 
      });
    }
    
    if (user.is_verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Account is already verified. Please login instead.' 
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const verificationToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' } 
    );
    
    await updateUserVerificationToken(user.id, verificationToken);
    
    await sendVerificationEmail(user.email, verificationToken);
    
    res.status(200).json({ 
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error while processing your request. Please try again later.' 
    });
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

     if (!user.password_hash) {
      return res.status(400).json({ message: 'This account was created using Google/Facebook. Please log in with that method.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ message: 'Please verify your email before signing in' });
    }
   
    await checkAndLogDevice(req, user.id);
    if(user.role ==="attendee") {
    await updateWelcomeGiftExpiry(user.id);
    }

    const payload = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      first_login_gift:user.first_login_gift,
      welcome_gift_expiry:user.welcome_gift_expiry
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
        role: user.role,
        first_login_gift:user.first_login_gift
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
      if (!email ) {
      return res.status(400).json({ message: 'Please enter your email' });
    }
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email.' });
    }
   
    const user_name = user.full_name

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

  if(!newPassword) {
     return res.status(400).json({ message: 'Please fill the fields' });
  }
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
        await createUserPoints(user.id);
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
        await createUserPoints(user.id);
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

export const googleAuthCallback = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.redirect(`${process.env.FRONTEND_URL}/signin?error=authentication_failed`);
  }

  try {
    await checkAndLogDevice(req, user.id); 
 if(user.role ==="attendee") {
    await updateWelcomeGiftExpiry(user.id);
    }
    const payload = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      first_login_gift:user.first_login_gift,
      welcome_gift_expiry:user.welcome_gift_expiry
      
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(`${process.env.FRONTEND_URL}`);
  } catch (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/signin?error=device_logging_failed`);
  }
};

export const facebookCallback = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.redirect(`${process.env.FRONTEND_URL}/signin?error=authentication_failed`);
  }

  try {
    await checkAndLogDevice(req, user.id); 
 if(user.role ==="attendee") {
    await updateWelcomeGiftExpiry(user.id);
    }
    const payload = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      first_login_gift:user.first_login_gift,
      welcome_gift_expiry:user.welcome_gift_expiry
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(`${process.env.FRONTEND_URL}`);
  } catch (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/signin?error=device_logging_failed`);
  }
};

export const deleteUser = async (req, res) => {
  const userId = req.user.id;

  try {

    const ticketsCount = await ticketcountByEventOwnerId(userId)

    if (ticketsCount > 0) {
      return res.status(400).json({
        message: "Cannot delete account: tickets have been sold for your events.",
      });
    }
    await deleteUserById(userId);
    res.clearCookie('token', { httpOnly: true });
    res.status(200).json({ message: 'Account and related data deleted successfully.' });

  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account.' });
  }
};
function parseUserAgent(ua) {
  let os = 'Unknown OS';
  if (/Windows NT 10\.0/.test(ua)) {os = 'Windows 10';}
  else if (/Mac OS X (\d+[_\.]\d+)/.test(ua)) {os = `Mac OS X ${ua.match(/Mac OS X (\d+[_\.]\d+)/)[1].replace('_', '.')}`;}
  else if (/Android/.test(ua)) {os = 'Android';}
  else if (/iPhone OS (\d+[_\.]\d+)/.test(ua)) {os = `iOS ${ua.match(/iPhone OS (\d+[_\.]\d+)/)[1].replace('_', '.')}`;}
  else if (/Linux/.test(ua)) {os = 'Linux';}

  let browser = 'Unknown Browser';
  let version = '';
  if (/OPR\/([\d\.]+)/.test(ua)) {
    browser = 'Opera';
    version = ua.match(/OPR\/([\d\.]+)/)[1];
  }
  else if (/Edg\/([\d\.]+)/.test(ua)) {
    browser = 'Edge';
    version = ua.match(/Edg\/([\d\.]+)/)[1];
  }
  else if (/Chrome\/([\d\.]+)/.test(ua)) {
    browser = 'Chrome';
    version = ua.match(/Chrome\/([\d\.]+)/)[1];
  }
  else if (/Safari\/([\d\.]+)/.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari';
    version = ua.match(/Version\/([\d\.]+)/)?.[1] || '';
  }
  else if (/Firefox\/([\d\.]+)/.test(ua)) {
    browser = 'Firefox';
    version = ua.match(/Firefox\/([\d\.]+)/)[1];
  }
  else if (/MSIE ([\d\.]+)/.test(ua)) {
    browser = 'IE';
    version = ua.match(/MSIE ([\d\.]+)/)[1];
  }
  else if (/Trident\/.*rv:([\d\.]+)/.test(ua)) {
    browser = 'IE';
    version = ua.match(/Trident\/.*rv:([\d\.]+)/)[1];
  }
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {deviceType = 'mobile';}

  return `${browser} ${version} on ${os} (${deviceType})`;
}

export const getUserDevices = async (req, res) => {
  const user = req.user;

  try {
    let devices = await getDevicesByUserId(user.id);
    devices = devices.map(device => ({
      ...device,
      friendlyDevice: parseUserAgent(device.device),
    }));

    res.status(200).json(devices);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user devices', error: error.message });
  }
};
export { passport };
