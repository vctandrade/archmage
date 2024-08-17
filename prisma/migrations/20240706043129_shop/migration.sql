-- CreateTable
CREATE TABLE "Shop" (
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "updatesAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("channelId")
);

-- CreateTable
CREATE TABLE "ShopSpell" (
    "channelId" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopSpell_pkey" PRIMARY KEY ("channelId","id")
);

-- AddForeignKey
ALTER TABLE "ShopSpell" ADD CONSTRAINT "ShopSpell_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Shop"("channelId") ON DELETE RESTRICT ON UPDATE CASCADE;
