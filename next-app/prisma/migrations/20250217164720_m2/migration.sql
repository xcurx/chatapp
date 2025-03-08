-- CreateTable
CREATE TABLE "Socket" (
    "socketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Socket_pkey" PRIMARY KEY ("socketId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Socket_userId_key" ON "Socket"("userId");

-- AddForeignKey
ALTER TABLE "Socket" ADD CONSTRAINT "Socket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
