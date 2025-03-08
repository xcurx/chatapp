-- CreateEnum
CREATE TYPE "Type" AS ENUM ('Accept', 'Request');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "Type" NOT NULL DEFAULT 'Request';
