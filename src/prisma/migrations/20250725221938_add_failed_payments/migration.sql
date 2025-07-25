-- CreateTable
CREATE TABLE "FailedPaymentAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedPaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FailedPaymentAttempt" ADD CONSTRAINT "FailedPaymentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
