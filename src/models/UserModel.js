import { prisma } from '../utils/prisma.js';

export const createUser = async (userData) => {
  return prisma.users.create({
    data: {
      full_name: userData.full_name,
      email: userData.email,
      password_hash: userData.password_hash,
      phone: userData.phone,
      role: userData.role,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    }
  });
};

export const findUserByEmail = async (email) => {
  return prisma.users.findUnique({
    where: { email }
  });
};

export const findUserById = async (id) => {
  return prisma.users.findUnique({
    where: { id }
  });
};
export const updatedUserImageProfile = async (userId,fileName) => {
  const imagePath = `/uploads/${fileName}`;
  return prisma.users.update({
      where: { id: userId },
      data: {
        profile_image: imagePath,
      },
    });
} 
export const updateUserProfile = async (userId, {fullName, phone, gender, birth_date} ) => {
  return await prisma.users.update({
    where: { id: userId },
    data: {
      full_name: fullName,
      phone: phone || null,
      gender: gender || null,
      birth_date: birth_date ? new Date(birth_date) : null,
      updated_at: new Date(),
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone: true,
      gender: true,
      birth_date: true,
    }
  });
};

export const findUserByVerificationToken = async (token) => {
  return prisma.users.findFirst({
    where: { verification_token: token }
  });
};

export const updateUserVerification = async (userId) => {
  return prisma.users.update({
    where: { id: userId },
    data: { 
      is_verified: true,
      verification_token: null 
    }
  });
};

export const updateUserVerificationToken = async (userId, token) => {
  return prisma.users.update({
    where: { id: userId },
    data: { verification_token: token }
  });
};

export const savePasswordResetToken = async (userId, token, expires) => {
  return prisma.users.update({
    where: { id: userId },
    data: {
      password_reset_token: token,
      password_reset_expires: expires
    }
  });
};

export const updatePassword = async (userId, hashedPassword) => {
  return prisma.users.update({
    where: { id: userId },
    data: {
      password_hash: hashedPassword
    }
  });
};
export const findPasswordByUserId=async(userId) => {
return prisma.users.findUnique({
  where: { id: userId },
  select: { password_hash: true, }
});
} 
export const clearResetToken = async (userId) => {
  return prisma.users.update({
    where: { id: userId },
    data: {
      password_reset_token: null,
      password_reset_expires: null
    }
  });
};

export const updateUserWithGoogleId = async (userId, googleId) => {
  return prisma.users.update({
    where: { id: userId },
    data: { google_id: googleId }
  });
};

export const updateUserWithFacebookId = async (userId, facebookId) => {
  return prisma.users.update({
    where: { id: userId },
    data: { facebook_id: facebookId }
  });
};

export const findUserByGoogleId = async (googleId) => {
  return prisma.users.findFirst({
    where: { google_id: googleId }
  });
};

export const findUserByFacebookId = async (facebookId) => {
  return prisma.users.findFirst({
    where: { facebook_id: facebookId }
  });
};