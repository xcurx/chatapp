/*
  Warnings:

  - You are about to drop the `Socket` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `avatar` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Socket" DROP CONSTRAINT "Socket_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT NOT NULL;

-- DropTable
DROP TABLE "Socket";
