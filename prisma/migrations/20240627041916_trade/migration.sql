-- CreateTable
CREATE TABLE "TradeOffer" (
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "give" INTEGER[],
    "receive" INTEGER[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeOffer_pkey" PRIMARY KEY ("channelId","messageId")
);
