import { PrismaClient, Sentiment } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { email: "owner@democoffee.com" },
    update: { name: "Demo Coffee Co" },
    create: {
      name: "Demo Coffee Co",
      email: "owner@democoffee.com",
    },
  });

  const location = await prisma.location.upsert({
    where: { slug: "demo-coffee-downtown" },
    update: {
      name: "Downtown",
      reviewLink: "https://example.com/review/demo-coffee-downtown",
      businessId: business.id,
    },
    create: {
      businessId: business.id,
      name: "Downtown",
      slug: "demo-coffee-downtown",
      reviewLink: "https://example.com/review/demo-coffee-downtown",
    },
  });

  await prisma.feedback.deleteMany({ where: { locationId: location.id } });

  await prisma.feedback.createMany({
    data: [
      {
        locationId: location.id,
        sentiment: Sentiment.NEGATIVE,
        message: "My drink took a long time and the order was wrong.",
        customerName: "Taylor",
        customerEmail: "taylor@example.com",
      },
      {
        locationId: location.id,
        sentiment: Sentiment.NEUTRAL,
        message: "The staff was kind, but the shop was very busy and hard to navigate.",
        customerName: "Jordan",
      },
      {
        locationId: location.id,
        sentiment: Sentiment.POSITIVE,
        message: "Great coffee and really friendly service.",
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
