-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "scrolls" INTEGER NOT NULL DEFAULT 0,
    "lastDailyAt" TIMESTAMPTZ,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "userId" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("userId","id")
);

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
