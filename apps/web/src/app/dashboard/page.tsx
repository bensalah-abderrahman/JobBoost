'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import ActivityCard
  from '../../components/dashboard/ActivityCard';

import ApplicationFunnel
  from '../../components/dashboard/ApplicationFunnel';

import {
  DashboardError,
  DashboardLoading,
} from '../../components/dashboard/DashboardFeedback';

import DashboardHeader
  from '../../components/dashboard/DashboardHeader';

import DashboardKpis
  from '../../components/dashboard/DashboardKpis';

import RankingCard
  from '../../components/dashboard/RankingCard';

import RecentApplications
  from '../../components/dashboard/RecentApplications';

import SourcesCard
  from '../../components/dashboard/SourcesCard';

import TopJobsCard
  from '../../components/dashboard/TopJobsCard';

import type {
  DashboardPeriod,
  DashboardStats,
} from '../../components/dashboard/dashboard.types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function DashboardPage() {
  const [
    dashboard,
    setDashboard,
  ] = useState<
    DashboardStats | null
  >(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const [
    error,
    setError,
  ] = useState(
    '',
  );

  const [
    period,
    setPeriod,
  ] = useState<
    DashboardPeriod
  >(
    7,
  );

  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  const loadDashboard =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setError(
            '',
          );

          const response =
            await fetch(
              `${API_URL}/dashboard/stats?days=${period}`,
              {
                cache:
                  'no-store',
              },
            );

          if (
            !response.ok
          ) {
            throw new Error(
              'Impossible de récupérer les statistiques.',
            );
          }

          const data =
            (await response.json()) as DashboardStats;

          setDashboard(
            data,
          );
        } catch (
          error
        ) {
          console.error(
            error,
          );

          setError(
            error instanceof
              Error
              ? error.message
              : 'Une erreur est survenue pendant le chargement.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        period,
      ],
    );

  useEffect(
    () => {
      void loadDashboard();
    },
    [
      loadDashboard,
    ],
  );

  // ============================================================
  // STATES
  // ============================================================

  if (
    loading &&
    !dashboard
  ) {
    return (
      <DashboardLoading />
    );
  }

  if (
    !dashboard
  ) {
    return (
      <DashboardError
        message={
          error
        }
        onRetry={() =>
          void loadDashboard()
        }
      />
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="dashboard-page">
      <div
        className="
          dashboard-container
          space-y-6
        "
      >
        <DashboardHeader
          loading={
            loading
          }
          onRefresh={() =>
            void loadDashboard()
          }
        />

        <DashboardKpis
          jobs={
            dashboard.jobs
          }
          applications={
            dashboard.applications
          }
        />

        <ActivityCard
          data={
            dashboard
              .activity
              .series
          }
          period={
            period
          }
          loading={
            loading
          }
          onPeriodChange={
            setPeriod
          }
        />

        <ApplicationFunnel
          applications={
            dashboard.applications
          }
        />

        <div
          className="
            grid gap-5
            lg:grid-cols-3
          "
        >
          <TopJobsCard
            jobs={
              dashboard.topJobs
            }
          />

          <SourcesCard
            totalJobs={
              dashboard
                .jobs.total
            }
            sources={
              dashboard.sources
            }
          />
        </div>

        <div
          className="
            grid gap-5
            lg:grid-cols-2
          "
        >
          <RankingCard
            title="Technologies recherchées"
            description="Technologies les plus présentes dans les offres analysées."
            items={
              dashboard
                .topTechnologies
            }
            variant="technology"
          />

          <RankingCard
            title="Compétences à renforcer"
            description="Compétences fréquemment demandées et encore absentes du profil."
            items={
              dashboard
                .topMissingSkills
            }
            variant="missing"
          />
        </div>

        <RecentApplications
          applications={
            dashboard
              .recentApplications
          }
        />
      </div>
    </main>
  );
}