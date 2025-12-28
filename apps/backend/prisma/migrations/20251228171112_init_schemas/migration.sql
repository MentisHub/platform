-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateEnum
CREATE TYPE "platform"."OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "platform"."ProjectRole" AS ENUM ('ADMIN', 'COLLABORATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "platform"."TrainingStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "platform"."NodeStatus" AS ENUM ('RUNNING', 'ONLINE', 'OFFLINE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "platform"."ServerAppStatus" AS ENUM ('STARTING', 'RUNNING', 'AGGREGATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "platform"."organization_cas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "vault_mount_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_cas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."node_certificates" (
    "node_id" UUID NOT NULL,
    "serial_number" VARCHAR(40) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "platform"."server_app_certificates" (
    "server_app_id" UUID NOT NULL,
    "serial_number" VARCHAR(40) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "platform"."organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

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
    "slug" VARCHAR(100) NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."project_collaborators" (
    "project_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "platform"."ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "project_collaborators_pkey" PRIMARY KEY ("project_id","organization_id")
);

-- CreateTable
CREATE TABLE "platform"."nodes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "psk_hash" TEXT,
    "status" "platform"."NodeStatus" NOT NULL DEFAULT 'INACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "organization_id" UUID NOT NULL,
    "project_id" UUID,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."training_runs" (
    "id" UUID NOT NULL,
    "status" "platform"."TrainingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "project_id" UUID NOT NULL,

    CONSTRAINT "training_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."rounds" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "run_id" UUID NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."run_participants" (
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,

    CONSTRAINT "run_participants_pkey" PRIMARY KEY ("run_id","node_id")
);

-- CreateTable
CREATE TABLE "platform"."round_participants" (
    "participated" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" VARCHAR(500),
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
CREATE TABLE "platform"."server_apps" (
    "id" UUID NOT NULL,
    "status" "platform"."ServerAppStatus" NOT NULL DEFAULT 'STARTING',
    "training_run_id" UUID NOT NULL,
    "pod_name" TEXT,
    "node_host" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "server_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_cas_organization_id_key" ON "platform"."organization_cas"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_certificates_node_id_key" ON "platform"."node_certificates"("node_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_certificates_serial_number_key" ON "platform"."node_certificates"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "server_app_certificates_server_app_id_key" ON "platform"."server_app_certificates"("server_app_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_app_certificates_serial_number_key" ON "platform"."server_app_certificates"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "platform"."organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_owner_id_idx" ON "platform"."organizations"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_slug_key" ON "platform"."projects"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_psk_hash_key" ON "platform"."nodes"("psk_hash");

-- CreateIndex
CREATE INDEX "nodes_organization_id_idx" ON "platform"."nodes"("organization_id");

-- CreateIndex
CREATE INDEX "training_runs_project_id_status_idx" ON "platform"."training_runs"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_run_id_number_key" ON "platform"."rounds"("run_id", "number");

-- CreateIndex
CREATE INDEX "artifacts_run_id_idx" ON "platform"."artifacts"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_apps_training_run_id_key" ON "platform"."server_apps"("training_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- AddForeignKey
ALTER TABLE "platform"."organization_cas" ADD CONSTRAINT "organization_cas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."node_certificates" ADD CONSTRAINT "node_certificates_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "platform"."nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."server_app_certificates" ADD CONSTRAINT "server_app_certificates_server_app_id_fkey" FOREIGN KEY ("server_app_id") REFERENCES "platform"."server_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."nodes" ADD CONSTRAINT "nodes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "platform"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."nodes" ADD CONSTRAINT "nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."training_runs" ADD CONSTRAINT "training_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "platform"."projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."rounds" ADD CONSTRAINT "rounds_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "platform"."training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."run_participants" ADD CONSTRAINT "run_participants_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "platform"."training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."run_participants" ADD CONSTRAINT "run_participants_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "platform"."nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."round_participants" ADD CONSTRAINT "round_participants_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "platform"."rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."round_participants" ADD CONSTRAINT "round_participants_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "platform"."nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."artifacts" ADD CONSTRAINT "artifacts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "platform"."training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."server_apps" ADD CONSTRAINT "server_apps_training_run_id_fkey" FOREIGN KEY ("training_run_id") REFERENCES "platform"."training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
