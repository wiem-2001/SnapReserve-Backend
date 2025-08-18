
import { PrismaClient ,  RefundStatus, RefundType } from '../generated/prisma/index.js';

const prisma = new PrismaClient();
export {prisma, RefundStatus, RefundType};