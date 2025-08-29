import express from 'express';
import { signup,signin , requestPasswordReset, resetPassword , logout, getMe , uploadProfileImage , updateProfile ,updateUserPassword, verifyEmail , resendVerificationEmail, googleAuthCallback , facebookCallback, deleteUser,getUserDevices} from '../controllers/authController.js'; 
import { signupValidator } from '../validators/authValidator.js';
import { validate } from '../middlewares/validate.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { upload } from '../utils/multer.js'
import passport from 'passport';

const router = express.Router();

router.post('/signup', signupValidator, validate, signup);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification-email', resendVerificationEmail);
router.post('/signin', validate, signin);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);
router.post('/upload-profile', verifyToken, upload.single('image'), uploadProfileImage);
router.put('/update-profile', verifyToken, updateProfile);
router.put('/update-password', verifyToken, updateUserPassword);

router.get('/google',passport.authenticate('google', { scope: ['profile', 'email'] ,prompt: 'select_account'}));

router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/signin' }),googleAuthCallback);

router.get('/facebook',passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', passport.authenticate('facebook', {session: false,failureRedirect: '/login',}),facebookCallback);
router.delete('/delete-account', verifyToken,deleteUser)
router.get('/devices', verifyToken, getUserDevices);

export default router;
