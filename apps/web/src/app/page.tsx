'use client';

import { useEffect, useState } from 'react';

type Experience = {
  id: string;
  company: string;
  title: string;
  location?: string;
};

type Education = {
  id: string;
  school: string;
  degree: string;
  field?: string;
};

type Skill = {
  id: string;
  name: string;
  category?: string;
  level?: number;
};

type Project = {
  id: string;
  name: string;
  description?: string;
  technologies: string[];
};

type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  website?: string;
  linkedin?: string;
  github?: string;

  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  projects: Project[];
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch(
  `${API_URL}/profile`
);

        if (!response.ok) {
          throw new Error('Erreur lors du chargement du profil');
        }

        const data = await response.json();

        setProfile(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return <main className="p-8">Chargement...</main>;
  }

  if (!profile) {
    return <main className="p-8">Aucun profil trouvé.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <section>
        <h1 className="text-3xl font-bold">
          {profile.firstName} {profile.lastName}
        </h1>

        <p className="mt-2 text-lg">{profile.headline}</p>

        <p className="mt-4">{profile.summary}</p>

        <div className="mt-4 space-y-1">
          <p>{profile.email}</p>
          <p>{profile.location}</p>
          <p>{profile.website}</p>
          <p>{profile.github}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">
          Expériences
        </h2>

        <div className="space-y-4">
          {profile.experiences.map((experience) => (
            <div
              key={experience.id}
              className="rounded-lg border p-4"
            >
              <h3 className="font-semibold">
                {experience.title}
              </h3>

              <p>{experience.company}</p>
              <p>{experience.location}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">
          Formations
        </h2>

        <div className="space-y-4">
          {profile.educations.map((education) => (
            <div
              key={education.id}
              className="rounded-lg border p-4"
            >
              <h3 className="font-semibold">
                {education.degree}
              </h3>

              <p>{education.school}</p>
              <p>{education.field}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">
          Compétences
        </h2>

        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <span
              key={skill.id}
              className="rounded-full border px-3 py-1"
            >
              {skill.name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">
          Projets
        </h2>

        <div className="space-y-4">
          {profile.projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border p-4"
            >
              <h3 className="font-semibold">
                {project.name}
              </h3>

              <p>{project.description}</p>

              <p className="mt-2 text-sm">
                {project.technologies.join(' • ')}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}