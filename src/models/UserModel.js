import { prisma } from '../utils/prisma.js';

export const createUser = async (userData) => {
  return prisma.users.create({
    data: {
      full_name: userData.full_name,
      email: userData.email,
      password_hash: userData.password_hash,
      phone: userData.phone,
      role: userData.role,
      birth_date: userData.birth_date,
      gender:userData.gender,
      is_verified: userData.is_verified || false,
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

export const deleteUserById = async (userId) => {
  return prisma.users.delete({
    where: { id: userId }
  });
}

export const getKnownDevicesByUserAgent  = async (userId, userAgent ) => {
  return prisma.userDevice.findMany({
    where: {
      userId: userId,
       device: userAgent
    }
  });
}
export const createKnownDevice = async (userId, userAgent) => {
  return await prisma.userDevice.create({
        data: {
          userId: userId,
          device: userAgent,
          lastUsed: new Date(),
        },
      });
};  

export const createSuspiciousLogin = async (userId, userAgent) => {
  return await  prisma.suspiciousActivity.create({
        data: {
          userId: userId,
          action: 'Login from new device',
          device: userAgent,
          createdAt: new Date(),
        },
      });

}
export const updateUserDevice = async (knownDevice) => {
  return await prisma.userDevice.update({
        where: { id: knownDevice.id },
        data: { lastUsed: new Date() },
      });
}

export const getDevicesByUserId = async (userId) => {
  return await prisma.userDevice.findMany({
    where: { userId: userId },
    orderBy: { lastUsed: 'desc' }
  });
};

export const getKnownDevicesByUserId= async(userId) => {
  return await prisma.userDevice.findMany({ where: { userId } });
}