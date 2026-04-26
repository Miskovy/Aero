/*
  Warnings:

  - A unique constraint covering the columns `[auth_provider,auth_provider_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `auth_tag` to the `git_sources` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `git_sources` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "git_sources" ADD COLUMN     "auth_tag" TEXT NOT NULL,
ADD COLUMN     "iv" TEXT NOT NULL,
ADD COLUMN     "key_version" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_auth_provider_id_key" ON "users"("auth_provider", "auth_provider_id");
