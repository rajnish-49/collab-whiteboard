-- CreateTable
CREATE TABLE "DrawingState" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "elements" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrawingState_roomId_key" ON "DrawingState"("roomId");

-- AddForeignKey
ALTER TABLE "DrawingState" ADD CONSTRAINT "DrawingState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
