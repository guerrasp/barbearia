-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NOT_SPECIFIED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender" DEFAULT 'NOT_SPECIFIED';
