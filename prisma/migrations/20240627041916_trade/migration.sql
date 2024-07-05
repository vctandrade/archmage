-- CreateTable
CREATE TABLE "TradeOffer" (
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "give" INTEGER[],
    "receive" INTEGER[],
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TradeOffer_pkey" PRIMARY KEY ("channelId","messageId")
);
