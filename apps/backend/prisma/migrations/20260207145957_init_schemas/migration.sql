-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateEnum
CREATE TYPE "platform"."OrgRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "platform"."ProjectRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "platform"."TrainingStatus" AS ENUM ('PENDING', 'DEPLOYING', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "platform"."NodeStatus" AS ENUM ('CREATED', 'INITIALIZING', 'READY', 'ACTIVE', 'ERROR', 'OFFLINE');

-- CreateTable
CREATE TABLE "platform"."fabs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "publisher_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "fab_hash" VARCHAR(64) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "storage_path" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL DEFAULT 'fab',
    "size_bytes" BIGINT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "organization_id" UUID,
    "project_id" UUID,
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."organization_members" (
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "platform"."OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id","user_id")
);

-- CreateTable
CREATE TABLE "platform"."projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "organization_id" UUID NOT NULL,
    "training_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."project_collaborators" (
    "project_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "invited_by" UUID,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "project_collaborators_pkey" PRIMARY KEY ("project_id","organization_id")
);

-- CreateTable
CREATE TABLE "platform"."project_members" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invited_by" UUID,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "platform"."ProjectRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "platform"."nodes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "platform"."NodeStatus" NOT NULL DEFAULT 'CREATED',
    "flower_node_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ec_public_key" TEXT,
    "organization_id" UUID NOT NULL,
    "project_id" UUID,
    "created_by_id" UUID NOT NULL,
    "token_hash" TEXT,
    "activated_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."node_refresh_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "node_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "node_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."training_runs" (
    "id" UUID NOT NULL,
    "status" "platform"."TrainingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "project_id" UUID NOT NULL,
    "fab_id" UUID,
    "flower_run_id" TEXT,
    "configuration" JSONB,
    "created_by_id" UUID NOT NULL,
    "metrics" JSONB,
    "serverapp_id" UUID,

    CONSTRAINT "training_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."rounds" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "total_participants" INTEGER,
    "successful_participants" INTEGER,
    "metrics" JSONB,
    "run_id" UUID NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."run_participants" (
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "run_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,

    CONSTRAINT "run_participants_pkey" PRIMARY KEY ("run_id","node_id")
);

-- CreateTable
CREATE TABLE "platform"."round_participants" (
    "failure_reason" VARCHAR(500),
    "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "metrics" JSONB,
    "round_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,

    CONSTRAINT "round_participants_pkey" PRIMARY KEY ("round_id","node_id")
);

-- CreateTable
CREATE TABLE "platform"."artifacts" (
    "id" UUID NOT NULL,
    "bucket_key" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" UUID NOT NULL,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fabs_fab_hash_key" ON "platform"."fabs"("fab_hash");

-- CreateIndex
CREATE INDEX "fabs_organization_id_is_default_idx" ON "platform"."fabs"("organization_id", "is_default");

-- CreateIndex
CREATE INDEX "fabs_project_id_idx" ON "platform"."fabs"("project_id");

-- CreateIndex
CREATE INDEX "fabs_is_default_is_public_idx" ON "platform"."fabs"("is_default", "is_public");

-- CreateIndex
CREATE UNIQUE INDEX "fabs_fab_hash_version_key" ON "platform"."fabs"("fab_hash", "version");

-- CreateIndex
CREATE INDEX "organizations_owner_id_idx" ON "platform"."organizations"("owner_id");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "platform"."project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_flower_node_id_key" ON "platform"."nodes"("flower_node_id");

-- CreateIndex
CREATE INDEX "nodes_organization_id_idx" ON "platform"."nodes"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_refresh_tokens_token_key" ON "platform"."node_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "node_refresh_tokens_node_id_idx" ON "platform"."node_refresh_tokens"("node_id");

-- CreateIndex
CREATE INDEX "node_refresh_tokens_token_idx" ON "platform"."node_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "training_runs_project_id_status_idx" ON "platform"."training_runs"("project_id", "status");

-- CreateIndex
CREATE INDEX "training_runs_fab_id_idx" ON "platform"."training_runs"("fab_id");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_run_id_number_key" ON "platform"."rounds"("run_id", "number");

-- CreateIndex
CREATE INDEX "artifacts_run_id_idx" ON "platform"."artifacts"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "platform"."users"("email");

-- AddForeignKey
ALTER TABLE "platform"."fabs" ADD CONSTRAINT "fabs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."fabs" ADD CONSTRAINT "fabs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."fabs" ADD CONSTRAINT "fabs_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "platform"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "platform"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."project_collaborators" ADD CONSTRAINT "project_collaborators_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."nodes" ADD CONSTRAINT "nodes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "platform"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."nodes" ADD CONSTRAINT "nodes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."nodes" ADD CONSTRAINT "nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."node_refresh_tokens" ADD CONSTRAINT "node_refresh_tokens_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "platform"."nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."training_runs" ADD CONSTRAINT "training_runs_serverapp_id_fkey" FOREIGN KEY ("serverapp_id") REFERENCES "platform"."nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."training_runs" ADD CONSTRAINT "training_runs_fab_id_fkey" FOREIGN KEY ("fab_id") REFERENCES "platform"."fabs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."training_runs" ADD CONSTRAINT "training_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."training_runs" ADD CONSTRAINT "training_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "platform"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."rounds" ADD CONSTRAINT "rounds_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "platform"."training_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."run_participants" ADD CONSTRAINT "run_participants_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "platform"."nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."run_participants" ADD CONSTRAINT "run_participants_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "platform"."training_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."round_participants" ADD CONSTRAINT "round_participants_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "platform"."nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."round_participants" ADD CONSTRAINT "round_participants_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "platform"."rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."artifacts" ADD CONSTRAINT "artifacts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "platform"."training_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Function to handle user creation - sync auth.users to platform.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO platform.users (id, email, name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
