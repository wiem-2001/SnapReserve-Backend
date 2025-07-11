import { body } from 'express-validator';

export const signupValidator = [
  body('fullName')
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 3 }).withMessage('Full name must be at least 3 characters long'),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('phone')
    .notEmpty().withMessage('Phone number is required'),

  body('role')
    .notEmpty().withMessage('Role is required')
];
