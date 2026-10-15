import { Injectable } from '@nestjs/common';
import { PrismaService, } from '../prisma/prisma.service.js';
type OllamaResponse = {
    message?: {
        content?: string;
    };
};
type SummaryResponse = {
    summary?: string;
};
@Injectable()
export class ResumeComposerService {
    constructor(private readonly prisma: PrismaService) { }
    // ============================================================
    // GET ONE
    // ============================================================
    async findOne(resumeId: string) {
        const resume = await this.prisma.resume.findUnique({
            where: {
                id: resumeId,
            },
            include: {
                job: {
                    include: {
                        analysis: true,
                    },
                },
            },
        });
        if (!resume) {
            throw new Error('CV introuvable');
        }
        return resume;
    }
    // ============================================================
    // GENERATE
    // ============================================================
    async generate(jobId: string) {
        const startedAt = Date.now();
        console.log(`[RESUME] Début génération ${jobId}`);
        // ==========================================================
        // 1. OFFRE
        // ==========================================================
        const job = await this.prisma.job.findUnique({
            where: {
                id: jobId,
            },
            include: {
                analysis: true,
            },
        });
        if (!job) {
            throw new Error('Offre introuvable');
        }
        // ==========================================================
        // 2. PROFIL
        // ==========================================================
        const profile = await this.prisma
            .candidateProfile
            .findFirst({
            include: {
                experiences: true,
                educations: true,
                skills: true,
                projects: true,
            },
        });
        if (!profile) {
            throw new Error('Profil candidat introuvable');
        }
        // ==========================================================
        // 3. TITRE DU CV SELON L'OFFRE
        // ==========================================================
        const resumeTitle = this.selectResumeTitle(job.title, job.description ?? '', profile.targetRoles ?? [], profile.headline);
        console.log('[RESUME] Offre :', job.title);
        console.log('[RESUME] Métiers ciblés :', profile.targetRoles);
        console.log('[RESUME] Titre CV sélectionné :', resumeTitle);
        // ==========================================================
        // 4. COMPÉTENCES CIBLES
        // ==========================================================
        const targetSkills = this.uniqueStrings([
            ...(job.analysis
                ?.requiredSkills ?? []),
            ...(job.analysis
                ?.optionalSkills ?? []),
            ...(job.analysis
                ?.technologies ?? []),
            ...(job.analysis
                ?.matchedSkills ?? []),
        ]);
        console.log('[RESUME] Target skills:', targetSkills);
        // ==========================================================
        // 4. COMPÉTENCES DU CV
        // ==========================================================
        const selectedSkills = profile.skills
            .map((skill) => ({
                skill,
                score: this.scoreCandidateSkill(skill.name, targetSkills),
            }))
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return (b.skill.level ?? 0) - (a.skill.level ?? 0);
            })
            .slice(0, 12)
            .map(({ skill }) => skill);
        // ==========================================================
        // 5. EXPÉRIENCES
        // ==========================================================
        const sortedExperiences = [...profile.experiences]
            .sort((a, b) => {
            if (a.current !==
                b.current) {
                return a.current
                    ? -1
                    : 1;
            }
            return (b.startDate.getTime() -
                a.startDate.getTime());
        });
        const scoredExperiences = sortedExperiences
            .map((experience) => ({
            experience,
            score: this.scoreExperience(experience, targetSkills),
        }));
        let relevantExperiences = scoredExperiences
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score -
            a.score)
            .slice(0, 4);
        // Fallback :
        // si aucun match clair,
        // prendre les expériences les plus récentes.
        if (relevantExperiences.length ===
            0) {
            relevantExperiences =
                scoredExperiences.slice(0, 3);
        }
        // Le matching choisit les expériences ; le CV les affiche par date.
        // On trie APRES le scoring pour garder les plus récentes en premier.
        relevantExperiences.sort((a, b) => {
            const aDate = a.experience.startDate?.getTime() ?? 0;
            const bDate = b.experience.startDate?.getTime() ?? 0;
            if (aDate !== bDate) {
                return bDate - aDate;
            }
            return Number(b.experience.current) - Number(a.experience.current);
        });
        const finalExperiences = relevantExperiences.map(({ experience, }) => {
            const experienceText = this.normalizeText([
                experience.company ?? '',
                experience.title ?? '',
                experience.description ?? '',
            ].join(' '));
            const isJobBoostExperience =
                experienceText.includes('jobboost');
            return {
                id: experience.id,
                company: experience.company,
                title: experience.title,
                location: experience.location,
                startDate: experience.startDate
                    ?.toISOString() ??
                    null,
                endDate: experience.endDate
                    ?.toISOString() ??
                    null,
                current: experience.current,
                description: experience.description,
                bullets: isJobBoostExperience
                    ? (experience.bullets ?? [])
                    : this.selectRelevantBullets(
                        experience.bullets,
                        targetSkills,
                    ),
            };
        });
        // ==========================================================
        // 6. PROJETS
        // ==========================================================
        const relevantProjects = profile.projects
            // Évite de répéter JobBoost AI dans Projets s'il est déjà dans Expériences.
            .filter((project) => !finalExperiences.some((experience) =>
                this.normalizeText(experience.company ?? '').includes(this.normalizeText(project.name)) ||
                (this.normalizeText(project.name).includes('jobboost') &&
                 this.normalizeText(`${experience.company ?? ''} ${experience.title ?? ''}`).includes('jobboost'))
            ))
            .map((project) => ({
                project,
                score: this.scoreProject(project, targetSkills),
            }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(({ project }) => ({
                id: project.id,
                name: project.name,
                description: this.compactProjectDescription(project.description),
                technologies: project.technologies,
                startDate: project.startDate?.toISOString() ?? null,
                endDate: project.endDate?.toISOString() ?? null,
                url: project.url ?? null,
            }));
        // ==========================================================
        // 7. FORMATIONS
        // ==========================================================
        const sortedEducations = [...profile.educations]
            .sort((a, b) => {
            const aDate = a.endDate?.getTime() ??
                a.startDate?.getTime() ??
                0;
            const bDate = b.endDate?.getTime() ??
                b.startDate?.getTime() ??
                0;
            return (bDate -
                aDate);
        });
        const finalEducations: Array<{
            id: string;
            school: string;
            degree: string;
            field: string | null;
            startDate: string | null;
            endDate: string | null;
            description: string | null;
        }> = [];
        for (const education of sortedEducations) {
            const duplicate = finalEducations.some((existing) => this.sameEducation(education, existing));
            if (duplicate) {
                continue;
            }
            finalEducations.push({
                id: education.id,
                school: education.school,
                degree: education.degree,
                field: education.field,
                startDate: education.startDate
                    ?.toISOString() ??
                    null,
                endDate: education.endDate
                    ?.toISOString() ??
                    null,
                description: education.description,
            });
        }
        // ==========================================================
        // 8. RÉSUMÉ IA
        //
        // Ollama ne sélectionne PLUS tout le CV.
        // Il produit uniquement 2-3 phrases.
        // ==========================================================
        const [summary, tailoredExperiences] = await Promise.all([
  this.generateSummary(
    job,
    profile,
    selectedSkills,
    finalExperiences,
    resumeTitle,
  ),
  this.tailorExperienceBullets(
    job,
    finalExperiences,
  ),
]);
        // ==========================================================
        // 9. CONTENT JSON
        // ==========================================================
        const content = {
            candidate: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                phone: profile.phone,
                location: profile.location,
                website: profile.website,
                github: profile.github,
                linkedin: profile.linkedin,
            },
            targetJob: {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                source: job.source,
                compatibilityScore: job.analysis
                    ?.score ??
                    null,
            },
            summary,
            skills: selectedSkills.map((skill) => ({
                name: skill.name,
                category: skill.category,
                level: skill.level,
            })),
            experiences: tailoredExperiences,
            projects: relevantProjects,
            educations: finalEducations,
        };
        // ==========================================================
        // 10. SAVE
        // ==========================================================
        const resume = await this.prisma.resume.create({
            data: {
                jobId: job.id,
                title: resumeTitle,
                summary,
                skills: selectedSkills.map((skill) => skill.name),
                content,
                status: 'DRAFT',
            },
        });
        console.log(`[RESUME] CV terminé en ${((Date.now() -
            startedAt) /
            1000).toFixed(1)}s`);
        console.log(`[RESUME] Skills: ${selectedSkills.length} | Expériences: ${finalExperiences.length} | Projets: ${relevantProjects.length}`);
        return {
            job: {
                id: job.id,
                title: job.title,
                company: job.company,
                score: job.analysis
                    ?.score ??
                    null,
            },
            resume,
        };
    }
    // ============================================================
    // SUMMARY
private async tailorExperienceBullets(
  job: any,
  experiences: any[],
): Promise<any[]> {
  if (!experiences.length || !process.env.OLLAMA_MODEL) {
    return experiences;
  }
  const source = experiences.map((experience) => ({
    id: experience.id,
    title: experience.title,
    company: experience.company,
    description: experience.description,
    bullets: experience.bullets ?? [],
  }));
  const prompt = `
Tu personnalises les descriptions d'un CV pour une offre.
Règles :
- Utilise uniquement les faits présents dans les expériences.
- Ne crée aucune compétence, technologie, mission ou résultat.
- Ne change pas les entreprises, les postes ou les dates.
- Reformule les bullets existants selon la pertinence.
- Maximum 4 bullets par expérience.
- Réponds uniquement avec du JSON.
Offre :
${JSON.stringify({
  title: job.title,
  description: (job.description ?? '').slice(0, 5000),
  requiredSkills: job.analysis?.requiredSkills ?? [],
  technologies: job.analysis?.technologies ?? [],
})}
Expériences :
${JSON.stringify(source)}
Format :
{
  "experiences": [
    {
      "id": "identifiant existant",
      "bullets": ["description reformulée"]
    }
  ]
}
`;
  try {
    const response = await fetch(
      `${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(90000),
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL,
          stream: false,
          format: 'json',
          think: false,
          options: {
            temperature: 0,
            num_predict: 900,
          },
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      message?: { content?: string };
    };
    const parsed = JSON.parse(data.message?.content ?? '{}') as {
      experiences?: {
        id: string;
        bullets: string[];
      }[];
    };
    return experiences.map((experience) => {
      const result = parsed.experiences?.find(
        (item) => item.id === experience.id,
      );
      // Version prudente : seuls les bullets source sont conservés.
      // Les reformulations IA doivent être validées avant usage.
      const proposed = Array.isArray(result?.bullets)
        ? result.bullets.filter(
            (bullet): bullet is string =>
              typeof bullet === 'string' && !!bullet.trim(),
          ).slice(0, 4)
        : [];
      return {
        ...experience,
        bullets: proposed.length > 0
          ? proposed
          : experience.bullets,
      };
    });
  } catch (error) {
    console.warn(
      '[RESUME] Reformulation indisponible, conservation des expériences',
      error,
    );
    return experiences;
  }
}
    // ============================================================
        // Raccourcit les projets sans modifier leurs faits.
    private compactProjectDescription(description: string | null): string | null {
        if (!description) return null;
        const cleaned = description.replace(/\s+/g, ' ').trim();
        const maxLength = 350;
        if (cleaned.length <= maxLength) return cleaned;
        const excerpt = cleaned.slice(0, maxLength);
        const lastSpace = excerpt.lastIndexOf(' ');
        return excerpt.slice(0, lastSpace > 250 ? lastSpace : maxLength).trim() + '…';
    }
private async generateSummary(job: any, profile: any, selectedSkills: any[], experiences: any[], resumeTitle: string): Promise<string | null> {
        const fallback = this.buildFallbackSummary(profile, selectedSkills, experiences, resumeTitle);
        const baseUrl = process.env
            .OLLAMA_BASE_URL ??
            'http://localhost:11434';
        const model = process.env
            .OLLAMA_MODEL;
        // Pas d'Ollama ?
        // Pas de blocage.
        if (!model) {
            console.warn('[RESUME] OLLAMA_MODEL absent → résumé fallback');
            return fallback;
        }
        // Prompt volontairement petit.
        const compactData = {
            targetJob: {
                title: job.title,
                company: job.company,
                requiredSkills: job.analysis
                    ?.requiredSkills ??
                    [],
                technologies: job.analysis
                    ?.technologies ??
                    [],
            },
            candidate: {
                headline: resumeTitle,
                targetRoles: profile.targetRoles ?? [],
                skills: selectedSkills
                    .slice(0, 10)
                    .map((skill) => skill.name),
                experiences: experiences
                    .slice(0, 3)
                    .map((experience) => ({
                    title: experience.title,
                    company: experience.company,
                    bullets: experience.bullets
                        .slice(0, 3),
                })),
            },
        };
        const prompt = `
Rédige le résumé professionnel d'un CV
personnalisé pour cette offre.
RÈGLES ABSOLUES :
- français uniquement
- 2 ou 3 phrases maximum
- factuel
- ATS-friendly
- aucune invention
- aucune nouvelle technologie
- aucune nouvelle compétence
- aucune nouvelle expérience
- aucune durée d'expérience inventée
- ne pas utiliser :
  "passionné"
  "expert"
  "expertise"
  "solide expérience"
  "vision stratégique"
Utilise uniquement les données suivantes :
${JSON.stringify(compactData)}
Retourne uniquement ce JSON :
{
  "summary": ""
}
`.trim();
        try {
            const startedAt = Date.now();
            console.log('[RESUME] Résumé Ollama...');
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Beaucoup plus court.
                signal: AbortSignal.timeout(45000),
                body: JSON.stringify({
                    model,
                    stream: false,
                    format: 'json',
                    think: false,
                    // Garde le modèle chargé
                    // pour la lettre ensuite.
                    keep_alive: '10m',
                    options: {
                        temperature: 0,
                        // Un résumé n'a pas
                        // besoin de 1000 tokens.
                        num_predict: 220,
                        num_ctx: 4096,
                    },
                    messages: [
                        {
                            role: 'system',
                            content: 'Tu rédiges un résumé de CV court et factuel sans jamais inventer.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama HTTP ${response.status}`);
            }
            const data = (await response.json()) as OllamaResponse;
            const rawContent = data.message
                ?.content
                ?.trim();
            if (!rawContent) {
                throw new Error('Réponse Ollama vide');
            }
            const parsed = JSON.parse(rawContent) as SummaryResponse;
            const aiSummary = parsed.summary
                ?.trim();
            if (!aiSummary) {
                throw new Error('Résumé Ollama vide');
            }
            console.log(`[RESUME] Résumé Ollama terminé en ${((Date.now() -
                startedAt) /
                1000).toFixed(1)}s`);
            return aiSummary;
        }
        catch (error) {
            // IMPORTANT :
            // le CV continue quand même.
            console.warn('[RESUME] Ollama résumé indisponible → fallback', error);
            return fallback;
        }
    }
    // ============================================================
    // FALLBACK SUMMARY
    // ============================================================
    private buildFallbackSummary(profile: any, selectedSkills: any[], experiences: any[], resumeTitle: string): string | null {
        const parts: string[] = [];
        const headline = resumeTitle.trim();
        if (headline) {
            parts.push(`${headline}.`);
        }
        const skills = selectedSkills
            .slice(0, 6)
            .map((skill) => skill.name);
        if (skills.length >
            0) {
            parts.push(`Compétences pertinentes : ${skills.join(', ')}.`);
        }
        const experienceLabels = experiences
            .slice(0, 2)
            .map((experience) => experience.company
            ? `${experience.title} chez ${experience.company}`
            : experience.title)
            .filter(Boolean);
        if (experienceLabels.length >
            0) {
            parts.push(`Parcours incluant ${experienceLabels.join(' et ')}.`);
        }
        if (parts.length >
            0) {
            return parts.join(' ');
        }
        return (profile.summary ??
            null);
    }
    // ============================================================
    // RESUME TITLE
    // ============================================================
    private selectResumeTitle(jobTitle: string, jobDescription: string, targetRoles: string[], fallbackHeadline: string | null | undefined): string {
        const roles = this.uniqueStrings(targetRoles ?? []);
        if (roles.length === 0) {
            return (fallbackHeadline?.trim() ||
                'Développeur Full-Stack');
        }
        const normalizedTitle = this.normalizeText(jobTitle);
        const normalizedDescription = this.normalizeText(jobDescription);
        const targetText = `${normalizedTitle} ${normalizedDescription}`.trim();
        let bestRole: string | null = null;
        let bestScore = 0;
        for (const role of roles) {
            const normalizedRole = this.normalizeText(role);
            if (!normalizedRole) {
                continue;
            }
            let score = 0;
            // Le titre de l'offre est prioritaire sur la description.
            if (normalizedTitle.includes(normalizedRole)) {
                score += 100;
            }
            else if (targetText.includes(normalizedRole)) {
                score += 40;
            }
            const roleWords = normalizedRole
                .split(' ')
                .filter((word) => word.length >= 4);
            for (const word of roleWords) {
                if (this.containsPhrase(normalizedTitle, word)) {
                    score += 12;
                }
                else if (this.containsPhrase(normalizedDescription, word)) {
                    score += 3;
                }
            }
            if (normalizedRole.includes('data analyst') ||
                normalizedRole.includes('analyste data') ||
                normalizedRole.includes('analyste donnees')) {
                if (normalizedTitle.includes('data analyst') ||
                    normalizedTitle.includes('analyste data') ||
                    normalizedTitle.includes('business analyst')) {
                    score += 80;
                }
                score += this.scoreRoleIndicators(targetText, [
                    'power bi',
                    'tableau',
                    'reporting',
                    'business intelligence',
                    'visualisation',
                    'dashboard',
                    'analyse donnees',
                    'sql',
                ], 7);
            }
            if (normalizedRole.includes('data engineer') ||
                normalizedRole.includes('ingenieur data') ||
                normalizedRole.includes('ingenieur donnees')) {
                if (normalizedTitle.includes('data engineer') ||
                    normalizedTitle.includes('ingenieur data') ||
                    normalizedTitle.includes('ingenieur donnees')) {
                    score += 80;
                }
                score += this.scoreRoleIndicators(targetText, [
                    'etl',
                    'data factory',
                    'pipeline',
                    'spark',
                    'hadoop',
                    'databricks',
                    'data lake',
                    'data warehouse',
                    'kafka',
                ], 8);
            }
            if (normalizedRole.includes('data scientist')) {
                if (normalizedTitle.includes('data scientist')) {
                    score += 80;
                }
                score += this.scoreRoleIndicators(targetText, [
                    'machine learning',
                    'deep learning',
                    'scikit learn',
                    'prediction',
                    'modelisation',
                    'python',
                    'pandas',
                ], 8);
            }
            if (normalizedRole.includes('ai engineer') ||
                normalizedRole.includes('ia engineer') ||
                normalizedRole.includes('ingenieur ia') ||
                normalizedRole.includes('ingenieur intelligence artificielle')) {
                if (normalizedTitle.includes('ai engineer') ||
                    normalizedTitle.includes('ia engineer') ||
                    normalizedTitle.includes('ingenieur ia')) {
                    score += 80;
                }
                score += this.scoreRoleIndicators(targetText, [
                    'intelligence artificielle',
                    'machine learning',
                    'deep learning',
                    'generative ai',
                    'ia generative',
                    'llm',
                    'rag',
                    'ollama',
                    'qwen',
                    'fine tuning',
                    'modeles ia',
                ], 9);
            }
            if (normalizedRole.includes('backend') ||
                normalizedRole.includes('back end')) {
                if (normalizedTitle.includes('backend') ||
                    normalizedTitle.includes('back end')) {
                    score += 80;
                }
                score += this.scoreRoleIndicators(targetText, [
                    'nestjs',
                    'node js',
                    'nodejs',
                    'spring boot',
                    'java',
                    'api rest',
                    'microservices',
                    'postgresql',
                    'redis',
                ], 6);
            }
            if (normalizedRole.includes('full stack') ||
                normalizedRole.includes('fullstack')) {
                if (normalizedTitle.includes('full stack') ||
                    normalizedTitle.includes('fullstack')) {
                    score += 80;
                }
                const hasFrontend = [
                    'react',
                    'next js',
                    'nextjs',
                    'angular',
                    'vue',
                ].some((technology) => this.containsPhrase(targetText, technology));
                const hasBackend = [
                    'node',
                    'nodejs',
                    'nestjs',
                    'java',
                    'spring boot',
                    'symfony',
                    'dotnet',
                    'api rest',
                ].some((technology) => this.containsPhrase(targetText, technology));
                if (hasFrontend && hasBackend) {
                    score += 35;
                }
            }
            console.log(`[RESUME TITLE] ${role} => ${score}`);
            if (score > bestScore) {
                bestScore = score;
                bestRole = role;
            }
        }
        if (!bestRole || bestScore <= 0) {
            return (fallbackHeadline?.trim() ||
                roles[0] ||
                'Développeur Full-Stack');
        }
        return bestRole;
    }
    private scoreRoleIndicators(normalizedText: string, indicators: string[], points: number): number {
        return indicators.reduce((score, indicator) => score +
            (this.containsPhrase(normalizedText, this.normalizeText(indicator))
                ? points
                : 0), 0);
    }
    // ============================================================
    // EXPERIENCE SCORING
    // ============================================================
    private scoreExperience(experience: any, targetSkills: string[]): number {
        let score = 0;
        for (const skill of targetSkills) {
            if (this.textContainsSkill(experience.title ?? '', skill)) {
                score += 5;
            }
            if (this.textContainsSkill(experience.description ??
                '', skill)) {
                score += 2;
            }
            for (const bullet of experience.bullets ??
                []) {
                if (this.textContainsSkill(bullet, skill)) {
                    score += 3;
                }
            }
        }
        // Petite priorité aux postes actuels.
        if (experience.current) {
            score += 1;
        }
        return score;
    }
    // ============================================================
    // PROJECT SCORING
    // ============================================================
    private scoreProject(project: any, targetSkills: string[]): number {
        let score = 0;
        for (const skill of targetSkills) {
            if (this.textContainsSkill(project.name ?? '', skill)) {
                score += 3;
            }
            if (this.textContainsSkill(project.description ??
                '', skill)) {
                score += 1;
            }
            for (const technology of project.technologies ??
                []) {
                if (this.skillsMatch(technology, skill)) {
                    score += 5;
                }
            }
        }
        return score;
    }
    // ============================================================
    // SKILL SCORING
    // ============================================================
    private scoreCandidateSkill(candidateSkill: string, targetSkills: string[]): number {
        return targetSkills.reduce((score, target) => score +
            (this.skillsMatch(candidateSkill, target)
                ? 1
                : 0), 0);
    }
    // ============================================================
    // BULLETS
    // ============================================================
    private selectRelevantBullets(bullets: string[], targetSkills: string[]): string[] {
        if (!bullets ||
            bullets.length ===
                0) {
            return [];
        }
        const scored = bullets.map((bullet, index) => ({
            bullet,
            index,
            score: targetSkills.filter((skill) => this.textContainsSkill(bullet, skill)).length,
        }));
        const result: string[] = [];
        // Les bullets réellement pertinents.
        for (const item of scored
            .filter((item) => item.score > 0)
            .sort((a, b) => {
            if (b.score !==
                a.score) {
                return (b.score -
                    a.score);
            }
            return (a.index -
                b.index);
        })) {
            if (!result.includes(item.bullet)) {
                result.push(item.bullet);
            }
            if (result.length >=
                4) {
                return result;
            }
        }
        // Complète avec des bullets existants.
        for (const bullet of bullets) {
            if (!result.includes(bullet)) {
                result.push(bullet);
            }
            if (result.length >=
                4) {
                break;
            }
        }
        return result;
    }
    // ============================================================
    // SKILL MATCHING
    // ============================================================
    private skillsMatch(candidateSkill: string, jobSkill: string): boolean {
        const candidate = this.normalizeSkill(candidateSkill);
        const searched = this.normalizeSkill(jobSkill);
        if (!candidate ||
            !searched) {
            return false;
        }
        if (candidate ===
            searched) {
            return true;
        }
        const candidateAliases = this.getSkillAliases(candidate);
        const searchedAliases = this.getSkillAliases(searched);
        if (candidateAliases.some((value) => searchedAliases.includes(value))) {
            return true;
        }
        // Inclusion seulement pour les expressions
        // multi-mots.
        //
        // Évite notamment :
        // "React Native" == "React"
        // simplement parce que React est inclus.
        const candidateWords = candidate.split(' ');
        const searchedWords = searched.split(' ');
        if (candidateWords.length >
            1 &&
            searchedWords.length >
                1) {
            return (candidate.includes(searched) ||
                searched.includes(candidate));
        }
        return false;
    }
    // ============================================================
    // TEXT CONTAINS SKILL
    // ============================================================
    private textContainsSkill(text: string, skill: string): boolean {
        const normalizedText = this.normalizeText(text);
        if (!normalizedText) {
            return false;
        }
        const normalizedSkill = this.normalizeSkill(skill);
        if (!normalizedSkill) {
            return false;
        }
        const possibleValues = this.getSkillAliases(normalizedSkill);
        return possibleValues.some((value) => this.containsPhrase(normalizedText, value));
    }
    // ============================================================
    // ALIASES
    // ============================================================
    private getSkillAliases(value: string): string[] {
        const groups: string[][] = [
            [
                'react',
                'reactjs',
                'react js',
            ],
            [
                'react native',
                'reactnative',
            ],
            [
                'node',
                'nodejs',
                'node js',
            ],
            [
                'nextjs',
                'next js',
            ],
            [
                'nestjs',
                'nest js',
                'nest',
            ],
            [
                'postgresql',
                'postgres',
            ],
            [
                'javascript',
                'js',
            ],
            [
                'typescript',
                'ts',
            ],
            [
                'microsoft azure',
                'azure',
            ],
            [
                'amazon web services',
                'aws',
            ],
            [
                'google cloud platform',
                'gcp',
            ],
            [
                'dotnet',
                'net',
                'asp net',
                'aspnet',
            ],
            [
                'spring boot',
                'springboot',
            ],
            [
                'java',
            ],
            [
                'python',
            ],
            [
                'angular',
                'angularjs',
            ],
            [
                'docker',
            ],
            [
                'kubernetes',
                'k8s',
            ],
            [
                'terraform',
            ],
            [
                'mysql',
            ],
            [
                'mongodb',
                'mongo db',
            ],
            [
                'redis',
            ],
            [
                'prisma',
            ],
            [
                'sequelize',
            ],
            [
                'typeorm',
                'type orm',
            ],
        ];
        for (const group of groups) {
            if (group.includes(value)) {
                return group;
            }
        }
        return [value];
    }
    // ============================================================
    // PHRASE MATCH
    // ============================================================
    private containsPhrase(normalizedText: string, normalizedPhrase: string): boolean {
        if (!normalizedPhrase) {
            return false;
        }
        const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexp = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'i');
        return regexp.test(normalizedText);
    }
    // ============================================================
    // NORMALIZE
    // ============================================================
    private normalizeSkill(value: string | null | undefined): string {
        return (value ??
            '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9+#]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    private normalizeText(value: string | null | undefined): string {
        return this.normalizeSkill(value);
    }
    // ============================================================
    // UNIQUE
    // ============================================================
    private uniqueStrings(values: string[]): string[] {
        const result: string[] = [];
        const seen = new Set<string>();
        for (const value of values) {
            const trimmed = value?.trim();
            if (!trimmed) {
                continue;
            }
            const key = this.normalizeSkill(trimmed);
            if (!key ||
                seen.has(key)) {
                continue;
            }
            seen.add(key);
            result.push(trimmed);
        }
        return result;
    }
    // ============================================================
    // EDUCATION DEDUP
    // ============================================================
    private sameEducation(a: {
        school: string;
        degree: string;
        field: string | null;
    }, b: {
        school: string;
        degree: string;
        field: string | null;
    }): boolean {
        const schoolA = this.normalizeEducationText(a.school);
        const schoolB = this.normalizeEducationText(b.school);
        if (schoolA !==
            schoolB) {
            return false;
        }
        const degreeA = this.normalizeEducationText(a.degree);
        const degreeB = this.normalizeEducationText(b.degree);
        const fieldA = this.normalizeEducationText(a.field);
        const fieldB = this.normalizeEducationText(b.field);
        const similarDegree = degreeA ===
            degreeB ||
            degreeA.includes(degreeB) ||
            degreeB.includes(degreeA);
        const similarField = !fieldA ||
            !fieldB ||
            fieldA ===
                fieldB ||
            fieldA.includes(fieldB) ||
            fieldB.includes(fieldA);
        return (similarDegree &&
            similarField);
    }
    private normalizeEducationText(value: string | null | undefined): string {
        return (value ??
            '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\b(en|de|du|des|et)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
