import { DuplicateCheckStatus, LlmStatus, Prisma } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OpenAiDuplicateSecondOpinionService } from '../llm/openai-duplicate-second-opinion.service';
import { DeterministicMatchingService } from './deterministic-matching.service';
import { DuplicateScoreService } from './duplicate-score.service';

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly deterministicMatchingService: DeterministicMatchingService,
    private readonly duplicateScoreService: DuplicateScoreService,
    private readonly openAiDuplicateSecondOpinionService: OpenAiDuplicateSecondOpinionService,
  ) {}

  async runRegistrationCheck(sourceMerchantId: string): Promise<void> {
    // DuplicateDetectionService check creation flow:
    // Create a fresh duplicate-check run record before deterministic and LLM evaluation begins.
    const duplicateCheck = await this.databaseService.duplicateCheck.create({
      data: {
        sourceMerchantId,
        status: DuplicateCheckStatus.PENDING,
      },
      select: {
        id: true,
      },
    });

    try {
      // DuplicateDetectionService deterministic evaluation flow:
      // Compute deterministic candidates first so OpenAI sees only the shortlist and the system remains deterministic-first.
      const deterministicResult =
        await this.deterministicMatchingService.evaluate(sourceMerchantId);

      if (!deterministicResult.shortlistedCandidates.length) {
        await this.databaseService.duplicateCheck.update({
          where: { id: duplicateCheck.id },
          data: {
            status: DuplicateCheckStatus.COMPLETED,
            llmStatus: LlmStatus.SKIPPED_NO_CANDIDATES,
            totalCandidatesChecked: deterministicResult.totalCandidatesChecked,
            candidatesAboveThreshold:
              deterministicResult.candidatesAboveThreshold.length,
            candidatesSentToLlm: 0,
            computedAt: new Date(),
            errorMessage: null,
          },
        });

        this.logger.log(
          `Duplicate detection completed for merchant ${sourceMerchantId} with no shortlist candidates`,
        );
        return;
      }

      // DuplicateDetectionService LLM review flow:
      // Request the OpenAI second opinion for shortlisted deterministic candidates and keep the result isolated from persistence fallback handling.
      const llmReviewResult =
        await this.openAiDuplicateSecondOpinionService.reviewShortlistedCandidates(
          deterministicResult.sourceMerchant,
          deterministicResult.shortlistedCandidates.map((candidate) => ({
            candidateMerchantId: candidate.candidateMerchantId,
            candidateMerchantName: candidate.candidateMerchantName,
            deterministicScore: candidate.deterministicScore,
          })),
        );

      const llmOpinionMap = new Map(
        llmReviewResult.opinions.map((opinion) => [
          opinion.candidateMerchantId,
          opinion,
        ]),
      );
      const finalCandidateResults =
        deterministicResult.shortlistedCandidates.map((candidate) =>
          this.duplicateScoreService.mergeCandidateResult(
            candidate,
            llmOpinionMap.get(candidate.candidateMerchantId),
            llmReviewResult.status,
          ),
        );

      // DuplicateDetectionService persistence flow:
      // Store the duplicate-check summary, LLM request metadata, and candidate-level score breakdown in one transaction.
      await this.databaseService.$transaction(async (tx) => {
        await tx.duplicateCheckCandidate.createMany({
          data: finalCandidateResults.map((candidate) => ({
            duplicateCheckId: duplicateCheck.id,
            candidateMerchantId: candidate.candidateMerchantId,
            levenshteinScore: candidate.levenshteinScore,
            trigramScore: candidate.trigramScore,
            jaroWinklerScore: candidate.jaroWinklerScore,
            deterministicScore: candidate.deterministicScore,
            llmScore: candidate.llmScore,
            finalConfidenceScore: candidate.finalConfidenceScore,
            signal: candidate.signal,
            recommendation: candidate.recommendation,
            llmStatus: candidate.llmStatus,
            llmReason: candidate.llmReason,
          })),
        });

        await tx.duplicateCheck.update({
          where: { id: duplicateCheck.id },
          data: {
            status: DuplicateCheckStatus.COMPLETED,
            llmStatus: llmReviewResult.status,
            totalCandidatesChecked: deterministicResult.totalCandidatesChecked,
            candidatesAboveThreshold:
              deterministicResult.candidatesAboveThreshold.length,
            candidatesSentToLlm:
              deterministicResult.shortlistedCandidates.length,
            computedAt: new Date(),
            errorMessage:
              llmReviewResult.status === LlmStatus.COMPLETED
                ? null
                : (llmReviewResult.errorMessage ?? null),
          },
        });

        if (
          llmReviewResult.status !== LlmStatus.SKIPPED_NO_CANDIDATES ||
          llmReviewResult.requestPayload ||
          llmReviewResult.errorMessage
        ) {
          await tx.llmRequestLog.create({
            data: {
              duplicateCheckId: duplicateCheck.id,
              sourceMerchantId,
              provider: llmReviewResult.provider,
              status: llmReviewResult.status,
              requestPayload: this.toJsonValue(llmReviewResult.requestPayload),
              responsePayload: this.toJsonValue(
                llmReviewResult.responsePayload,
              ),
              errorMessage: llmReviewResult.errorMessage,
              timeoutMs: llmReviewResult.timeoutMs,
              durationMs: llmReviewResult.durationMs,
            },
          });
        }
      });

      this.logger.log(
        `Duplicate detection completed for merchant ${sourceMerchantId} with ${finalCandidateResults.length} stored candidate results`,
      );
    } catch (error) {
      // DuplicateDetectionService failure flow:
      // Mark the duplicate-check run as failed so merchant onboarding can continue while preserving failure diagnostics for later review.
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown duplicate detection error';
      await this.databaseService.duplicateCheck.update({
        where: { id: duplicateCheck.id },
        data: {
          status: DuplicateCheckStatus.FAILED,
          llmStatus: LlmStatus.FAILED,
          errorMessage,
          computedAt: new Date(),
        },
      });

      this.logger.error(
        `Duplicate detection failed for merchant ${sourceMerchantId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private toJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
