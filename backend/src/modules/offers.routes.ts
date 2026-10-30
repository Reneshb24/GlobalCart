import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

function formatOfferWithTier(offer: any) {
  let eligibleTier = "ALL";
  let cleanDescription = offer.description || "";
  if (offer.description && offer.description.includes("[TIER:")) {
    const match = offer.description.match(/\[TIER:([A-Za-z0-9_,]+)\]/);
    if (match) {
      eligibleTier = match[1].trim();
      cleanDescription = offer.description.replace(/\[TIER:[^\]]+\]/g, "").trim();
    }
  }
  return {
    ...offer,
    eligibleTier,
    cleanDescription: cleanDescription || offer.description
  };
}

router.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const rawOffers = await prisma.offer.findMany({
      where: {
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gt: now }
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { endsAt: "asc" }
    });

    const offers = rawOffers.map(formatOfferWithTier);
    res.json({ offers, count: offers.length });
  } catch {
    res.status(500).json({ error: "Unable to retrieve offers" });
  }
});

router.get("/:code", async (req, res) => {
  const rawCode = req.params.code;
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode).trim().toUpperCase();

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    res.status(400).json({ error: "Invalid offer code" });
    return;
  }

  try {
    const offer = await prisma.offer.findUnique({
      where: { code },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!offer || offer.status !== "ACTIVE" ||
        offer.startsAt > new Date() || offer.endsAt <= new Date()) {
      res.status(404).json({ error: "Offer is not currently available" });
      return;
    }

    res.json({ offer: formatOfferWithTier(offer) });
  } catch {
    res.status(500).json({ error: "Unable to validate offer" });
  }
});

export default router;
