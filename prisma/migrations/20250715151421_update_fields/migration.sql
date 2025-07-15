/*
  Warnings:

  - You are about to drop the column `refreshTokenjJti` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "refreshTokenjJti",
ADD COLUMN     "refreshTokenJti" TEXT;
