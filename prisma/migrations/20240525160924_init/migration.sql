-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "scrolls" INTEGER NOT NULL DEFAULT 0,
    "lastDailyAt" TIMESTAMPTZ,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSpell" (
    "userId" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserSpell_pkey" PRIMARY KEY ("userId","id")
);

-- AddForeignKey
ALTER TABLE "UserSpell" ADD CONSTRAINT "UserSpell_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
