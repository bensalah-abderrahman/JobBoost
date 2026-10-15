import prismaPkg from "@prisma/client";
const { PrismaClient } = prismaPkg;
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "node:fs";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL manquante");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const profiles = await prisma.candidateProfile.findMany({
      select: { id: true, firstName: true, lastName: true },
    });

    if (profiles.length !== 1) {
      throw new Error(
        `Nombre de profils : ${profiles.length}. ` +
        "Sélection explicite du profil nécessaire."
      );
    }

    const profile = profiles[0];

    const skills = JSON.parse(
      fs.readFileSync(
        "data/skills-societe-generale.json",
        "utf8"
      )
    );

    let added = 0;
    let existing = 0;
    let pending = 0;

    for (const skill of skills) {
      if (skill.level === null) {
        pending++;
        console.log(`À confirmer : ${skill.name}`);
        continue;
      }

      const result = await prisma.skill.findUnique({
        where: {
          profileId_name: {
            profileId: profile.id,
            name: skill.name,
          },
        },
      });

      if (result) {
        existing++;
        continue;
      }

      await prisma.skill.create({
        data: {
          profileId: profile.id,
          name: skill.name,
          category: skill.category,
          level: skill.level,
        },
      });

      added++;
      console.log(`Ajouté : ${skill.name}`);
    }

    console.log({
      profile: `${profile.firstName} ${profile.lastName}`,
      added,
      existing,
      pending,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

