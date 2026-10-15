'use client';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import ApplicationDocumentsModal
  from '../../components/jobs/ApplicationDocumentsModal';
import JobCard
  from '../../components/jobs/JobCard';
import JobsAutomationPanel
  from '../../components/jobs/automation/JobsAutomationPanel';
import type {
  AutomationFeedItem,
} from '../../components/jobs/automation/automation.types';
import JobsFilters
  from '../../components/jobs/JobsFilters';
import JobsHeader
  from '../../components/jobs/JobsHeader';
import JobsLoading
  from '../../components/jobs/JobsLoading';
import JobsPagination
  from '../../components/jobs/JobsPagination';
import PreparationModal
  from '../../components/jobs/PreparationModal';
import {
  useJobsPage,
} from '../../components/jobs/useJobsPage';
const API_URL = 'http://localhost:3001';
export default function JobsPage() {
  // ============================================================
  // JOBS STATE
  // ============================================================
  const state =
    useJobsPage();
  // ============================================================
  // AUTOMATION UI STATE
  // ============================================================
  const [
    automationOpen,
    setAutomationOpen,
  ] = useState(
    true,
  );
  const [
    automationRunning,
    setAutomationRunning,
  ] = useState(
    false,
  );
  const [
    automationFeed,
    setAutomationFeed,
  ] = useState<
    AutomationFeedItem[]
  >(
    [],
  );
  const automationBaselineVersionsRef =
    useRef<Map<string, string>>(
      new Map(),
    );
  const automationVisibleJobIdsRef =
    useRef<Set<string>>(
      new Set(),
    );
  const automationPollRef =
    useRef<number | null>(
      null,
    );
  useEffect(
    () => {
      return () => {
        if (
          automationPollRef.current !==
          null
        ) {
          window.clearInterval(
            automationPollRef.current,
          );
        }
      };
    },
    [],
  );
  // ============================================================
  // FRANCE TRAVAIL AUTOMATION
  //
  // FRONT ONLY POUR LE MOMENT
  //
  // Prochaine étape :
  //
  // POST /automations/france-travail/run
  //
  // puis récupération du flux depuis le backend.
  // ============================================================
  async function runFranceTravailAutomation() {
    if (
      automationRunning
    ) {
      return;
    }
    setAutomationOpen(
      true,
    );
    setAutomationFeed(
      [],
    );
    setAutomationRunning(
      true,
    );
    automationVisibleJobIdsRef.current =
      new Set();
    if (
      automationPollRef.current !==
      null
    ) {
      window.clearInterval(
        automationPollRef.current,
      );
      automationPollRef.current =
        null;
    }
    try {
      const baselineResponse =
        await fetch(
          `${API_URL}/jobs`,
          {
            cache:
              'no-store',
          },
        );
      if (
        !baselineResponse.ok
      ) {
        throw new Error(
          `Impossible de charger les offres existantes (${baselineResponse.status}).`,
        );
      }
      const baselineJobs =
        await baselineResponse.json();
      automationBaselineVersionsRef.current =
        new Map(
          (
            Array.isArray(
              baselineJobs,
            )
              ? baselineJobs
              : []
          )
            .filter(
              (
                job: any,
              ) =>
                job.source ===
                'FRANCE_TRAVAIL',
            )
            .map(
              (
                job: any,
              ) => [
                  job.id,
                  String(
                    job.updatedAt ??
                    job.sourceUpdatedAt ??
                    '',
                  ),
                ],
            ),
        );
      const response =
        await fetch(
          `${API_URL}/automations/france-travail/run`,
          {
            method:
              'POST',
          },
        );
      const responseText =
        await response.text();
      if (
        !response.ok
      ) {
        let message =
          responseText ||
          `Erreur API ${response.status}`;
        try {
          const json =
            JSON.parse(
              responseText,
            );
          if (
            typeof json.message ===
            'string'
          ) {
            message =
              json.message;
          }
        } catch {
          // Réponse texte classique.
        }
        throw new Error(
          message,
        );
      }
      let checks =
        0;
      let stableChecks =
        0;
      let previousSignature =
        '';
      const refreshFeed =
        async () => {
          checks +=
            1;
          try {
            const [
              jobsResponse,
              applicationsResponse,
            ] =
              await Promise.all([
                fetch(
                  `${API_URL}/jobs`,
                  {
                    cache:
                      'no-store',
                  },
                ),
                fetch(
                  `${API_URL}/applications`,
                  {
                    cache:
                      'no-store',
                  },
                ),
              ]);
            if (
              !jobsResponse.ok
            ) {
              throw new Error(
                `Erreur /jobs ${jobsResponse.status}`,
              );
            }
            const jobs =
              await jobsResponse.json();
            const applications =
              applicationsResponse.ok
                ? await applicationsResponse.json()
                : [];
            const applicationByJobId =
              new Map<
                string,
                any
              >();
            if (
              Array.isArray(
                applications,
              )
            ) {
              for (
                const application
                of applications
              ) {
                if (
                  application?.jobId
                ) {
                  applicationByJobId.set(
                    application.jobId,
                    application,
                  );
                }
              }
            }
            const changedJobs =
              (
                Array.isArray(
                  jobs,
                )
                  ? jobs
                  : []
              )
                .filter(
                  (
                    job: any,
                  ) => {
                    if (
                      job.source !==
                      'FRANCE_TRAVAIL'
                    ) {
                      return false;
                    }
                    const baselineVersion =
                      automationBaselineVersionsRef
                        .current
                        .get(
                          job.id,
                        );
                    const currentVersion =
                      String(
                        job.updatedAt ??
                        job.sourceUpdatedAt ??
                        '',
                      );
                    return (
                      baselineVersion ===
                      undefined ||
                      baselineVersion !==
                      currentVersion
                    );
                  },
                )
                .sort(
                  (
                    a: any,
                    b: any,
                  ) => {
                    const aTime =
                      new Date(
                        a.updatedAt ??
                        a.createdAt ??
                        0,
                      ).getTime();
                    const bTime =
                      new Date(
                        b.updatedAt ??
                        b.createdAt ??
                        0,
                      ).getTime();
                    return (
                      aTime -
                      bTime
                    );
                  },
                )
                .slice(
                  0,
                  3,
                );
            const nextUnseenJob =
              changedJobs.find(
                (
                  job: any,
                ) =>
                  !automationVisibleJobIdsRef
                    .current
                    .has(
                      job.id,
                    ),
              );
            if (
              nextUnseenJob
            ) {
              automationVisibleJobIdsRef
                .current
                .add(
                  nextUnseenJob.id,
                );
            }
            const visibleJobs =
              changedJobs.filter(
                (
                  job: any,
                ) =>
                  automationVisibleJobIdsRef
                    .current
                    .has(
                      job.id,
                    ),
              );
            const nextFeed:
              AutomationFeedItem[] =
              visibleJobs.map(
                (
                  job: any,
                ) => {
                  const application =
                    applicationByJobId.get(
                      job.id,
                    );
                  if (
                    application
                  ) {
                    return {
                      id:
                        job.id,
                      externalId:
                        job.externalId,
                      title:
                        job.title,
                      company:
                        job.company,
                      location:
                        job.location,
                      source:
                        'FRANCE_TRAVAIL',
                      status:
                        'ready',
                      score:
                        job.analysis
                          ?.score ??
                        null,
                      message:
                        'CV et lettre prêts · candidature prête à valider',
                    };
                  }
                  if (
                    job.analysis
                  ) {
                    return {
                      id:
                        job.id,
                      externalId:
                        job.externalId,
                      title:
                        job.title,
                      company:
                        job.company,
                      location:
                        job.location,
                      source:
                        'FRANCE_TRAVAIL',
                      status:
                        'analyzing',
                      score:
                        job.analysis
                          ?.score ??
                        null,
                      message:
                        'Analyse terminée · préparation du CV et de la lettre',
                    };
                  }
                  return {
                    id:
                      job.id,
                    externalId:
                      job.externalId,
                    title:
                      job.title,
                    company:
                      job.company,
                    location:
                      job.location,
                    source:
                      'FRANCE_TRAVAIL',
                    status:
                      'imported',
                    score:
                      null,
                    message:
                      'Nouvelle offre détectée · analyse IA en cours',
                  };
                },
              );
            setAutomationFeed(
              nextFeed,
            );
            const signature =
              nextFeed
                .map(
                  (
                    item,
                  ) =>
                    `${item.id}:${item.status}:${item.score ?? ''}`,
                )
                .join(
                  '|',
                );
            if (
              signature ===
              previousSignature
            ) {
              stableChecks +=
                1;
            } else {
              stableChecks =
                0;
              previousSignature =
                signature;
            }
            const allVisible =
              changedJobs.length >
              0 &&
              automationVisibleJobIdsRef
                .current
                .size >=
              changedJobs.length;
            const allReady =
              nextFeed.length >
              0 &&
              nextFeed.every(
                (
                  item,
                ) =>
                  item.status ===
                  'ready',
              );
            if (
              allVisible &&
              allReady &&
              stableChecks >=
              6
            ) {
              if (
                automationPollRef.current !==
                null
              ) {
                window.clearInterval(
                  automationPollRef.current,
                );
                automationPollRef.current =
                  null;
              }
              setAutomationRunning(
                false,
              );
              return;
            }
            if (
              nextFeed.length >
              0 &&
              stableChecks >=
              40
            ) {
              if (
                automationPollRef.current !==
                null
              ) {
                window.clearInterval(
                  automationPollRef.current,
                );
                automationPollRef.current =
                  null;
              }
              setAutomationRunning(
                false,
              );
              return;
            }
            if (
              checks >=
              400
            ) {
              if (
                automationPollRef.current !==
                null
              ) {
                window.clearInterval(
                  automationPollRef.current,
                );
                automationPollRef.current =
                  null;
              }
              setAutomationRunning(
                false,
              );
            }
          } catch (
          error
          ) {
            console.error(
              '[AUTOMATION POLLING]',
              error,
            );
          }
        };
      await refreshFeed();
      automationPollRef.current =
        window.setInterval(
          () => {
            void refreshFeed();
          },
          750,
        );
    } catch (
    error
    ) {
      console.error(
        '[AUTOMATION FRANCE TRAVAIL]',
        error,
      );
      setAutomationFeed([
        {
          id:
            `automation-error-${Date.now()}`,
          title:
            'Automatisation France Travail',
          source:
            'FRANCE_TRAVAIL',
          status:
            'error',
          message:
            error instanceof Error
              ? error.message
              : 'Impossible de lancer l’automatisation.',
        },
      ]);
      setAutomationRunning(
        false,
      );
    }
  }
  // ============================================================
  // INITIAL LOADING
  // ============================================================
  if (
    state.loading &&
    state.jobs.length ===
    0
  ) {
    return (
      <JobsLoading />
    );
  }
  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {state.sentToast && (
        <div
          className="
            fixed right-5 top-5 z-[90]
            w-[min(360px,calc(100vw-2.5rem))]
            rounded-2xl
            border border-emerald-400/20
            bg-zinc-950/95
            px-4 py-3
            text-white
            shadow-2xl
            backdrop-blur
            animate-[pulse_0.35s_ease-out_1]
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex h-8 w-8
                shrink-0
                items-center justify-center
                rounded-full
                bg-emerald-500
                text-sm font-bold
                text-white
              "
            >
              ✓
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-emerald-300">
                Candidature envoyée
              </p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-white">
                {state.sentToast.jobTitle}
              </p>
              <p className="mt-1 text-[9px] text-zinc-400">
                Retirée des opportunités
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================
          PREPARATION MODAL
          ======================================================== */}
      <PreparationModal
        status={
          state.preparationStatus
        }
        progress={
          state.preparationProgress
        }
        step={
          state.preparationStep
        }
        jobTitle={
          state.preparationJobTitle
        }
        error={
          state.preparationError
        }
        result={
          state.preparationResult
        }
        alreadyPrepared={
          state.preparationAlreadyPrepared
        }
        feedback={
          state.preparationFeedback
        }
        job={
          state.preparationJob
        }
        sending={
          Boolean(
            state.preparationResult &&
            state.sendingApplicationId ===
            state
              .preparationResult
              .applicationId,
          )
        }
        confirming={
          Boolean(
            state.preparationResult &&
            state.confirmingApplicationId ===
            state
              .preparationResult
              .applicationId,
          )
        }
        onClose={
          state.closePreparationModal
        }
        onOpenDocuments={(
          tab,
        ) => {
          if (
            !state.preparationResult
          ) {
            return;
          }
          state.openDocuments(
            state.preparationJobTitle,
            state.preparationResult,
            tab,
          );
        }}
        onSend={() => {
          if (
            state.preparationResult
          ) {
            void state.sendApplication(
              state.preparationResult,
            );
          }
        }}
        onConfirm={() => {
          if (
            !state.preparationResult
          ) {
            return;
          }
          const prepared =
            state.preparationResult;
          void (
            async () => {
              const confirmed =
                await state.confirmApplicationSent(
                  prepared,
                );
              if (
                confirmed
              ) {
                state.closePreparationModal();
              }
            }
          )();
        }}
        onReopen={() => {
          if (
            state.preparationJob
          ) {
            state.reopenApplicationSite(
              state.preparationJob,
            );
          }
        }}
      />
      {/* ========================================================
          DOCUMENTS MODAL
          ======================================================== */}
      <ApplicationDocumentsModal
        open={
          state.documentsModal.open
        }
        jobTitle={
          state.documentsModal.jobTitle
        }
        applicationId={
          state.documentsModal.applicationId
        }
        resumeId={
          state.documentsModal.resumeId
        }
        coverLetterId={
          state.documentsModal.coverLetterId
        }
        initialTab={
          state.documentsModal.initialTab
        }
        onClose={
          state.closeDocuments
        }
      />
      {/* ========================================================
          PAGE
          ======================================================== */}
      <main className="jobs-page">
        <div
          className="
            jobs-container
            space-y-5
          "
        >
          {/* ====================================================
              HEADER
              ==================================================== */}
          <JobsHeader
            filteredCount={
              state.filteredJobs
                .length
            }
            totalCount={
              state.jobs.length
            }
          />
          {/* ====================================================
              AUTOMATION
              ==================================================== */}
          <JobsAutomationPanel
            open={
              automationOpen
            }
            running={
              automationRunning
            }
            feed={
              automationFeed
            }
            onToggle={() =>
              setAutomationOpen(
                (
                  current,
                ) =>
                  !current,
              )
            }
            onRunFranceTravail={
              runFranceTravailAutomation
            }
            onClearFeed={() =>
              setAutomationFeed(
                [],
              )
            }
          />
          {/* ====================================================
              FILTERS
              ==================================================== */}
          <JobsFilters
            search={
              state.search
            }
            source={
              state.source
            }
            sources={
              state.sources
            }
            onSearchChange={
              state.setSearch
            }
            onSourceChange={
              state.setSource
            }
          />
          {/* ====================================================
              LOAD ERROR
              ==================================================== */}
          {state.loadError && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-[11px]
                text-red-700
                dark:border-red-400/15
                dark:bg-red-500/10
                dark:text-red-300
              "
            >
              {
                state.loadError
              }
            </div>
          )}
          {/* ====================================================
              RESULT HEADER
              ==================================================== */}
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                  text-[11px]
                  font-semibold
                  text-zinc-700
                  dark:text-zinc-300
                "
              >
                Opportunités
              </p>
              <p
                className="
                  mt-1
                  text-[9px]
                  text-zinc-400
                "
              >
                {state.firstResult}–
                {state.lastResult}{' '}
                affichées
              </p>
            </div>
          </div>
          {/* ====================================================
              JOB LIST
              ==================================================== */}
          <div className="space-y-3">
            {state.paginatedJobs.map(
              (
                job,
              ) => {
                const prepared =
                  state
                    .preparedApplications[
                  job.id
                  ];
                const feedback =
                  prepared
                    ? state
                      .applicationFeedback[
                    prepared
                      .applicationId
                    ] ??
                    null
                    : null;
                return (
                  <JobCard
                    key={
                      job.id
                    }
                    job={
                      job
                    }
                    prepared={
                      prepared
                    }
                    feedback={
                      feedback
                    }
                    isAnalyzing={
                      state
                        .analyzingJobId ===
                      job.id
                    }
                    isPreparing={
                      state
                        .preparingJobId ===
                      job.id
                    }
                    anyAnalyzing={
                      state.analyzingJobId !==
                      null
                    }
                    anyPreparing={
                      state.preparingJobId !==
                      null
                    }
                    sending={
                      Boolean(
                        prepared &&
                        state
                          .sendingApplicationId ===
                        prepared
                          .applicationId,
                      )
                    }
                    confirming={
                      Boolean(
                        prepared &&
                        state
                          .confirmingApplicationId ===
                        prepared
                          .applicationId,
                      )
                    }
                    isDeleting={
                      state.deletingJobId ===
                      job.id
                    }
                    isExiting={
                      state.exitingJobIds.has(
                        job.id,
                      )
                    }
                    onAnalyze={() =>
                      void state.analyzeJob(
                        job.id,
                      )
                    }
                    onPrepare={() =>
                      void state.prepareApplication(
                        job,
                      )
                    }
                    onOpenDocuments={() => {
                      if (
                        !prepared
                      ) {
                        return;
                      }
                      state.openDocuments(
                        job.title,
                        prepared,
                        'resume',
                      );
                    }}
                    onSend={() => {
                      if (
                        !prepared
                      ) {
                        return;
                      }
                      void state.sendApplication(
                        prepared,
                      );
                    }}
                    onConfirm={() => {
                      if (
                        !prepared
                      ) {
                        return;
                      }
                      void state.confirmApplicationSent(
                        prepared,
                      );
                    }}
                    onReopen={() =>
                      state.reopenApplicationSite(
                        job,
                      )
                    }
                  onDelete={() =>
                      void state.deleteJob(
                        job,
                      )
                    }
                  />
                );
              },
            )}
          </div>
          {/* ====================================================
              EMPTY STATE
              ==================================================== */}
          {state.filteredJobs
            .length ===
            0 && (
              <div
                className="
                jobs-card
                py-14
                text-center
              "
              >
                <p
                  className="
                  text-[12px]
                  font-semibold
                  text-zinc-700
                  dark:text-zinc-300
                "
                >
                  Aucune offre trouvée
                </p>
                <p
                  className="
                  mt-1
                  text-[10px]
                  text-zinc-400
                "
                >
                  Modifiez votre recherche
                  ou votre filtre de source.
                </p>
              </div>
            )}
          {/* ====================================================
              PAGINATION
              ==================================================== */}
          <JobsPagination
            page={
              state.page
            }
            pageSize={
              state.pageSize
            }
            totalPages={
              state.totalPages
            }
            totalResults={
              state.filteredJobs
                .length
            }
            firstResult={
              state.firstResult
            }
            lastResult={
              state.lastResult
            }
            onPageChange={
              state.setPage
            }
            onPageSizeChange={
              state.setPageSize
            }
          />
        </div>
      </main>
    </>
  );
}
