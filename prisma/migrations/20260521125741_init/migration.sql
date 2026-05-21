-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MERCHANT');

-- CreateEnum
CREATE TYPE "merchant_status" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "duplicate_check_status" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "llm_status" AS ENUM ('COMPLETED', 'FAILED', 'TIMEOUT', 'SKIPPED_NO_CANDIDATES', 'SKIPPED_DISABLED');

-- CreateEnum
CREATE TYPE "duplicate_signal" AS ENUM ('deterministic', 'llm', 'both');

-- CreateEnum
CREATE TYPE "duplicate_recommendation" AS ENUM ('LIKELY_DUPLICATE', 'REVIEW', 'WEAK_MATCH', 'NO_MATCH');

-- CreateEnum
CREATE TYPE "audit_entity_type" AS ENUM ('USER', 'MERCHANT', 'DUPLICATE_CHECK', 'DUPLICATE_CHECK_CANDIDATE');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('USER_CREATED', 'ADMIN_CREATED', 'MERCHANT_CREATED', 'MERCHANT_VERIFIED', 'MERCHANT_REJECTED', 'DUPLICATE_CHECK_STARTED', 'DUPLICATE_CHECK_COMPLETED', 'DUPLICATE_CHECK_FAILED', 'LLM_REQUEST_SENT', 'LLM_REQUEST_FAILED', 'LLM_REQUEST_TIMEOUT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "business_name" VARCHAR(255) NOT NULL,
    "normalized_business_name" VARCHAR(255) NOT NULL,
    "business_email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(50),
    "cac_number" VARCHAR(100),
    "address" TEXT,
    "status" "merchant_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verified_at" TIMESTAMPTZ(6),
    "verified_by_user_id" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "rejected_by_user_id" UUID,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_checks" (
    "id" UUID NOT NULL,
    "source_merchant_id" UUID NOT NULL,
    "status" "duplicate_check_status" NOT NULL DEFAULT 'PENDING',
    "llm_status" "llm_status" NOT NULL DEFAULT 'SKIPPED_NO_CANDIDATES',
    "deterministic_threshold" DECIMAL(3,2) NOT NULL DEFAULT 0.6,
    "deterministic_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.65,
    "llm_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.35,
    "total_candidates_checked" INTEGER NOT NULL DEFAULT 0,
    "candidates_above_threshold" INTEGER NOT NULL DEFAULT 0,
    "candidates_sent_to_llm" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "computed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "duplicate_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_check_candidates" (
    "id" UUID NOT NULL,
    "duplicate_check_id" UUID NOT NULL,
    "candidate_merchant_id" UUID NOT NULL,
    "levenshtein_score" DECIMAL(3,2) NOT NULL,
    "trigram_score" DECIMAL(3,2) NOT NULL,
    "jaro_winkler_score" DECIMAL(3,2) NOT NULL,
    "deterministic_score" DECIMAL(3,2) NOT NULL,
    "llm_score" DECIMAL(3,2),
    "final_confidence_score" DECIMAL(3,2) NOT NULL,
    "signal" "duplicate_signal" NOT NULL,
    "recommendation" "duplicate_recommendation" NOT NULL,
    "llm_status" "llm_status" NOT NULL,
    "llm_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_check_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_request_logs" (
    "id" UUID NOT NULL,
    "duplicate_check_id" UUID NOT NULL,
    "source_merchant_id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL DEFAULT 'openai',
    "status" "llm_status" NOT NULL,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "timeout_ms" INTEGER,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_type" "audit_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "audit_action" NOT NULL,
    "performed_by_user_id" UUID,
    "performed_by_label" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_user_id_key" ON "merchants"("user_id");

-- CreateIndex
CREATE INDEX "merchants_business_name_idx" ON "merchants"("business_name");

-- CreateIndex
CREATE INDEX "merchants_normalized_business_name_idx" ON "merchants"("normalized_business_name");

-- CreateIndex
CREATE INDEX "merchants_business_email_idx" ON "merchants"("business_email");

-- CreateIndex
CREATE INDEX "merchants_cac_number_idx" ON "merchants"("cac_number");

-- CreateIndex
CREATE INDEX "merchants_status_idx" ON "merchants"("status");

-- CreateIndex
CREATE INDEX "merchants_created_at_idx" ON "merchants"("created_at");

-- CreateIndex
CREATE INDEX "merchants_verified_by_user_id_idx" ON "merchants"("verified_by_user_id");

-- CreateIndex
CREATE INDEX "merchants_rejected_by_user_id_idx" ON "merchants"("rejected_by_user_id");

-- CreateIndex
CREATE INDEX "duplicate_checks_source_merchant_id_idx" ON "duplicate_checks"("source_merchant_id");

-- CreateIndex
CREATE INDEX "duplicate_checks_status_idx" ON "duplicate_checks"("status");

-- CreateIndex
CREATE INDEX "duplicate_checks_llm_status_idx" ON "duplicate_checks"("llm_status");

-- CreateIndex
CREATE INDEX "duplicate_checks_computed_at_idx" ON "duplicate_checks"("computed_at");

-- CreateIndex
CREATE INDEX "duplicate_checks_created_at_idx" ON "duplicate_checks"("created_at");

-- CreateIndex
CREATE INDEX "duplicate_candidates_duplicate_check_id_idx" ON "duplicate_check_candidates"("duplicate_check_id");

-- CreateIndex
CREATE INDEX "duplicate_candidates_candidate_merchant_id_idx" ON "duplicate_check_candidates"("candidate_merchant_id");

-- CreateIndex
CREATE INDEX "duplicate_candidates_final_confidence_score_idx" ON "duplicate_check_candidates"("final_confidence_score");

-- CreateIndex
CREATE INDEX "duplicate_candidates_recommendation_idx" ON "duplicate_check_candidates"("recommendation");

-- CreateIndex
CREATE INDEX "duplicate_candidates_signal_idx" ON "duplicate_check_candidates"("signal");

-- CreateIndex
CREATE INDEX "duplicate_candidates_check_score_idx" ON "duplicate_check_candidates"("duplicate_check_id", "final_confidence_score");

-- CreateIndex
CREATE INDEX "llm_logs_duplicate_check_id_idx" ON "llm_request_logs"("duplicate_check_id");

-- CreateIndex
CREATE INDEX "llm_logs_source_merchant_id_idx" ON "llm_request_logs"("source_merchant_id");

-- CreateIndex
CREATE INDEX "llm_logs_provider_idx" ON "llm_request_logs"("provider");

-- CreateIndex
CREATE INDEX "llm_logs_status_idx" ON "llm_request_logs"("status");

-- CreateIndex
CREATE INDEX "llm_logs_created_at_idx" ON "llm_request_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_user_id_idx" ON "audit_logs"("performed_by_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_rejected_by_user_id_fkey" FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_checks" ADD CONSTRAINT "duplicate_checks_source_merchant_id_fkey" FOREIGN KEY ("source_merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_check_candidates" ADD CONSTRAINT "duplicate_check_candidates_duplicate_check_id_fkey" FOREIGN KEY ("duplicate_check_id") REFERENCES "duplicate_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_check_candidates" ADD CONSTRAINT "duplicate_check_candidates_candidate_merchant_id_fkey" FOREIGN KEY ("candidate_merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_request_logs" ADD CONSTRAINT "llm_request_logs_duplicate_check_id_fkey" FOREIGN KEY ("duplicate_check_id") REFERENCES "duplicate_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_request_logs" ADD CONSTRAINT "llm_request_logs_source_merchant_id_fkey" FOREIGN KEY ("source_merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
