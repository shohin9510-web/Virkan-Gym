package tj.fitplan.free

import android.content.Context
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import kotlin.math.max

class VirkanGymStore(context: Context) {
    private val prefs = context.getSharedPreferences("virkan_gym", Context.MODE_PRIVATE)

    var heightCm: Int
        get() = prefs.getInt("height_cm", 184)
        set(value) = prefs.edit().putInt("height_cm", value).apply()

    var currentWeightKg: Float
        get() = prefs.getFloat("current_weight", 108.4f)
        set(value) = prefs.edit().putFloat("current_weight", value).apply()

    var targetWeightKg: Float
        get() = prefs.getFloat("target_weight", 80f)
        set(value) = prefs.edit().putFloat("target_weight", value).apply()

    var programStartEpochDay: Long
        get() {
            val fallback = LocalDate.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toEpochDay()
            return prefs.getLong("program_start_epoch_day", fallback)
        }
        set(value) = prefs.edit().putLong("program_start_epoch_day", value).apply()

    fun baseWeight(exerciseId: String): Float = prefs.getFloat("base_$exerciseId", 0f)

    fun saveBaseWeights(values: Map<String, Float>) {
        prefs.edit().apply {
            values.forEach { (id, value) -> putFloat("base_$id", value.coerceAtLeast(0f)) }
        }.apply()
    }

    fun programWeek(today: LocalDate = LocalDate.now()): Int {
        val startMonday = LocalDate.ofEpochDay(programStartEpochDay)
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val currentMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val weeks = ((currentMonday.toEpochDay() - startMonday.toEpochDay()) / 7L).toInt()
        return max(1, weeks + 1)
    }

    fun weeklyWeightAdd(today: LocalDate = LocalDate.now()): Float = (programWeek(today) - 1) * 2.5f

    fun currentExerciseWeight(exerciseId: String, today: LocalDate = LocalDate.now()): Float {
        val base = baseWeight(exerciseId)
        return if (base <= 0f) 0f else base + weeklyWeightAdd(today)
    }

    fun currentPoolDistance(today: LocalDate = LocalDate.now()): Int = 200 + (programWeek(today) - 1) * 50

    fun markWorkoutComplete(dayOfWeek: DayOfWeek, today: LocalDate = LocalDate.now()) {
        val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        prefs.edit().putBoolean("done_${monday.toEpochDay()}_${dayOfWeek.value}", true).apply()
    }

    fun isWorkoutComplete(dayOfWeek: DayOfWeek, today: LocalDate = LocalDate.now()): Boolean {
        val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return prefs.getBoolean("done_${monday.toEpochDay()}_${dayOfWeek.value}", false)
    }

    fun addWeightEntry(weightKg: Float, date: LocalDate = LocalDate.now()) {
        currentWeightKg = weightKg
        val entries = weightEntries().toMutableList()
        entries.removeAll { it.epochDay == date.toEpochDay() }
        entries += WeightEntry(date.toEpochDay(), weightKg)
        val encoded = entries.sortedBy { it.epochDay }.takeLast(30)
            .joinToString(";") { "${it.epochDay}:${it.weightKg}" }
        prefs.edit().putString("weight_history", encoded).apply()
    }

    fun weightEntries(): List<WeightEntry> {
        val raw = prefs.getString("weight_history", "").orEmpty()
        if (raw.isBlank()) {
            return listOf(WeightEntry(LocalDate.now().toEpochDay(), currentWeightKg))
        }
        return raw.split(';').mapNotNull { token ->
            val parts = token.split(':')
            if (parts.size != 2) return@mapNotNull null
            val day = parts[0].toLongOrNull() ?: return@mapNotNull null
            val weight = parts[1].toFloatOrNull() ?: return@mapNotNull null
            WeightEntry(day, weight)
        }.sortedBy { it.epochDay }
    }
}
