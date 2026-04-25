-- AlterTable
ALTER TABLE "environment_variables" ADD COLUMN     "auth_tag" VARCHAR(255),
ADD COLUMN     "iv" VARCHAR(255);

-- AlterTable
ALTER TABLE "service_secrets" ADD COLUMN     "auth_tag" VARCHAR(255),
ADD COLUMN     "iv" VARCHAR(255);
