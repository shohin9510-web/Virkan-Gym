package tj.fitplan.free

import java.time.DayOfWeek

data class ScheduleDay(
    val dayOfWeek: DayOfWeek,
    val shortName: String,
    val title: String,
    val type: WorkoutDayType
)

enum class WorkoutDayType {
    STRENGTH,
    CARDIO_POOL,
    REST,
    STRENGTH_POOL
}

data class ExerciseTemplate(
    val id: String,
    val name: String,
    val muscle: String,
    val sets: Int,
    val reps: Int,
    val weighted: Boolean = true
)

data class WeightEntry(
    val epochDay: Long,
    val weightKg: Float
)

val VirkanSchedule = listOf(
    ScheduleDay(DayOfWeek.MONDAY, "Пн", "Грудь + трицепс", WorkoutDayType.STRENGTH),
    ScheduleDay(DayOfWeek.TUESDAY, "Вт", "Кардио + бассейн", WorkoutDayType.CARDIO_POOL),
    ScheduleDay(DayOfWeek.WEDNESDAY, "Ср", "Отдых", WorkoutDayType.REST),
    ScheduleDay(DayOfWeek.THURSDAY, "Чт", "Спина + бицепс", WorkoutDayType.STRENGTH),
    ScheduleDay(DayOfWeek.FRIDAY, "Пт", "Отдых", WorkoutDayType.REST),
    ScheduleDay(DayOfWeek.SATURDAY, "Сб", "Ноги + бассейн", WorkoutDayType.STRENGTH_POOL),
    ScheduleDay(DayOfWeek.SUNDAY, "Вс", "Отдых", WorkoutDayType.REST)
)

val MondayExercises = listOf(
    ExerciseTemplate("abs_start", "Пресс — скручивания", "Пресс", 3, 20, weighted = false),
    ExerciseTemplate("bench", "Жим штанги лёжа", "Грудь", 3, 10),
    ExerciseTemplate("incline_db", "Жим гантелей на наклонной скамье", "Грудь", 3, 10),
    ExerciseTemplate("chest_fly", "Сведение рук / разводка", "Грудь", 3, 12),
    ExerciseTemplate("triceps_push", "Разгибание рук на блоке", "Трицепс", 3, 12),
    ExerciseTemplate("triceps_overhead", "Разгибание рук из-за головы", "Трицепс", 3, 12),
    ExerciseTemplate("abs_end", "Пресс — подъём ног", "Пресс", 3, 15, weighted = false)
)

val ThursdayExercises = listOf(
    ExerciseTemplate("abs_start", "Пресс — скручивания", "Пресс", 3, 20, weighted = false),
    ExerciseTemplate("lat_pull", "Тяга верхнего блока", "Спина", 3, 10),
    ExerciseTemplate("row", "Тяга горизонтального блока", "Спина", 3, 10),
    ExerciseTemplate("one_arm_row", "Тяга гантели одной рукой", "Спина", 3, 10),
    ExerciseTemplate("curl", "Сгибание рук с гантелями", "Бицепс", 3, 12),
    ExerciseTemplate("hammer", "Молотковые сгибания", "Бицепс", 3, 12),
    ExerciseTemplate("abs_end", "Пресс — подъём ног", "Пресс", 3, 15, weighted = false)
)

val SaturdayExercises = listOf(
    ExerciseTemplate("abs_start", "Пресс — скручивания", "Пресс", 3, 20, weighted = false),
    ExerciseTemplate("squat", "Приседания", "Ноги", 3, 10),
    ExerciseTemplate("leg_press", "Жим ногами", "Ноги", 3, 12),
    ExerciseTemplate("leg_ext", "Разгибание ног", "Ноги", 3, 12),
    ExerciseTemplate("leg_curl", "Сгибание ног", "Ноги", 3, 12),
    ExerciseTemplate("calf", "Подъём на носки", "Икры", 4, 15),
    ExerciseTemplate("abs_end", "Пресс — подъём ног", "Пресс", 3, 15, weighted = false)
)

val AllWeightedExercises = (MondayExercises + ThursdayExercises + SaturdayExercises)
    .filter { it.weighted }
    .distinctBy { it.id }
