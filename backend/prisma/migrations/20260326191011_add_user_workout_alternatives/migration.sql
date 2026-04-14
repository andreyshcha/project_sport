-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "generated_plan_id" INTEGER,
ADD COLUMN     "user_id" INTEGER;

-- CreateTable
CREATE TABLE "exercise_alternatives" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "alternative_id" INTEGER NOT NULL,
    "reason" TEXT,

    CONSTRAINT "exercise_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_alternatives_exercise_id_alternative_id_key" ON "exercise_alternatives"("exercise_id", "alternative_id");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_generated_plan_id_fkey" FOREIGN KEY ("generated_plan_id") REFERENCES "generated_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_alternatives" ADD CONSTRAINT "exercise_alternatives_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_alternatives" ADD CONSTRAINT "exercise_alternatives_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
