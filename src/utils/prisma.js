
import { PrismaClient ,  RefundStatus, RefundType,PointsActionType } from '../generated/prisma/index.js';

const prisma = new PrismaClient();
export {prisma, RefundStatus, RefundType,PointsActionType};