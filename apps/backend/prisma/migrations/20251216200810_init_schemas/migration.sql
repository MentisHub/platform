-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('ADMIN', 'COLLABORATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('RUNNING', 'ONLINE', 'OFFLINE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ServerAppStatus" AS ENUM ('STARTING', 'RUNNING', 'AGGREGATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "organization_cas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "vault_mount_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_cas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_certificates" (
    "node_id" UUID NOT NULL,
    "serial_number" VARCHAR(40) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocation_reason" VARCHAR(500)
);

-- CreateTable
CREATE TABLE "server_app_certificates" (
    "server_app_id" UUID NOT NULL,
    "serial_number" VARCHAR(40) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "organizations" (
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
CREATE TABLE "organization_members" (
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id","user_id")
);

-- CreateTable
CREATE TABLE "projects" (
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
CREATE TABLE "project_collaborators" (
    "project_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "project_collaborators_pkey" PRIMARY KEY ("project_id","organization_id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "psk_hash" TEXT,
    "status" "NodeStatus" NOT NULL DEFAULT 'INACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "organization_id" UUID NOT NULL,
    "project_id" UUID,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_runs" (
    "id" UUID NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "project_id" UUID NOT NULL,

    CONSTRAINT "training_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "run_id" UUID NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_participants" (
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,

    CONSTRAINT "run_participants_pkey" PRIMARY KEY ("run_id","node_id")
);

-- CreateTable
CREATE TABLE "round_participants" (
    "participated" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" VARCHAR(500),
    "round_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,

    CONSTRAINT "round_participants_pkey" PRIMARY KEY ("round_id","node_id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" UUID NOT NULL,
    "bucket_key" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "round_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" UUID NOT NULL,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_apps" (
    "id" UUID NOT NULL,
    "status" "ServerAppStatus" NOT NULL DEFAULT 'STARTING',
    "training_run_id" UUID NOT NULL,
    "pod_name" TEXT,
    "node_host" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "server_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_cas_organization_id_key" ON "organization_cas"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_certificates_node_id_key" ON "node_certificates"("node_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_certificates_serial_number_key" ON "node_certificates"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "server_app_certificates_server_app_id_key" ON "server_app_certificates"("server_app_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_app_certificates_serial_number_key" ON "server_app_certificates"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_owner_id_idx" ON "organizations"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_slug_key" ON "projects"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_psk_hash_key" ON "nodes"("psk_hash");

-- CreateIndex
CREATE INDEX "nodes_organization_id_idx" ON "nodes"("organization_id");

-- CreateIndex
CREATE INDEX "training_runs_project_id_status_idx" ON "training_runs"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_run_id_number_key" ON "rounds"("run_id", "number");

-- CreateIndex
CREATE INDEX "artifacts_run_id_idx" ON "artifacts"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_apps_training_run_id_key" ON "server_apps"("training_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "organization_cas" ADD CONSTRAINT "organization_cas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_certificates" ADD CONSTRAINT "node_certificates_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_app_certificates" ADD CONSTRAINT "server_app_certificates_server_app_id_fkey" FOREIGN KEY ("server_app_id") REFERENCES "server_apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_runs" ADD CONSTRAINT "training_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_participants" ADD CONSTRAINT "run_participants_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_participants" ADD CONSTRAINT "run_participants_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_participants" ADD CONSTRAINT "round_participants_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_participants" ADD CONSTRAINT "round_participants_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_apps" ADD CONSTRAINT "server_apps_training_run_id_fkey" FOREIGN KEY ("training_run_id") REFERENCES "training_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
