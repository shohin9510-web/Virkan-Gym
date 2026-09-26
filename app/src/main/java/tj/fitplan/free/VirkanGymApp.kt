package tj.fitplan.free

import android.app.DatePickerDialog
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Pool
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.roundToInt

private val Gold = Color(0xFFFFB72B)
    private val VirkanColors = darkColorScheme(
    primary = Gold,
    onPrimary = Color(0xFF171006),
    secondary = Color(0xFFFFD67A),
    background = Color(0xFF0D1015),
    surface = Color(0xFF171B22),
    surfaceVariant = Color(0xFF222832),
    onBackground = Color(0xFFF4F6FA),
    onSurface = Color(0xFFE4E6EA),
    onSurfaceVariant = Color(0xFFABB3BF)
)

private enum class AppTab(val title: String, val icon: ImageVector) {
    HOME("Сегодня", Icons.Filled.Home),
    PLAN("План", Icons.Filled.CalendarMonth),
    WORKOUT("Тренировка", Icons.Filled.FitnessCenter),
    PROGRESS("Прогресс", Icons.Filled.TrendingUp),
    SETTINGS("Настройки", Icons.Filled.Settings)
}

@Composable
fun VirkanGymApp() {
    val context = LocalContext.current
    val store = remember { VirkanGymStore(context) }
    var selectedTab by rememberSaveable { mutableStateOf(AppTab.HOME) }
    var revision by remember { mutableIntStateOf(0) }

    val today = LocalDate.now()
    val currentSchedule = VirkanSchedule.first { it.dayOfWeek == today.dayOfWeek }
    val defaultWorkoutDay = if (currentSchedule.type == WorkoutDayType.REST) DayOfWeek.MONDAY else today.dayOfWeek
    var selectedWorkoutDayValue by rememberSaveable { mutableIntStateOf(defaultWorkoutDay.value) }

    MaterialTheme(colorScheme = VirkanColors) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Scaffold(
                bottomBar = {
                    NavigationBar(containerColor = Color(0xFF11151B)) {
                        AppTab.entries.forEach { tab ->
                            NavigationBarItem(
                                selected = selectedTab == tab,
                                onClick = { selectedTab = tab },
                                icon = { Icon(tab.icon, contentDescription = tab.title) },
                                label = { Text(tab.title) }
                            )
                        }
                    }
                }
            ) { innerPadding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    key(revision, selectedTab, selectedWorkoutDayValue) {
                        when (selectedTab) {
                            AppTab.HOME -> HomeScreen(
                                store = store,
                                onStartWorkout = { day ->
                                    selectedWorkoutDayValue = day.value
                                    selectedTab = AppTab.WORKOUT
                                }
                            )
                            AppTab.PLAN -> PlanScreen(
                                store = store,
                                onOpenWorkout = { day ->
                                    selectedWorkoutDayValue = day.value
                                    selectedTab = AppTab.WORKOUT
                                }
                            )
                            AppTab.WORKOUT -> WorkoutScreen(
                                store = store,
                                selectedDay = DayOfWeek.of(selectedWorkoutDayValue),
                                onSelectDay = { selectedWorkoutDayValue = it.value },
                                onCompleted = {
                                    revision++
                                    selectedTab = AppTab.HOME
                                }
                            )
                            AppTab.PROGRESS -> ProgressScreen(
                                store = store,
                                onChanged = { revision++ }
                            )
                            AppTab.SETTINGS -> SettingsScreen(
                                store = store,
                                onChanged = { revision++ }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppHeader(subtitle: String? = null) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Black)
        ) {
            Image(
                painter = painterResource(R.drawable.virkan_gym_icon),
                contentDescription = "Virkan Gym",
                modifier = Modifier.size(54.dp)
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text("Virkan Gym", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            subtitle?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

@Composable
private fun HomeScreen(store: VirkanGymStore, onStartWorkout: (DayOfWeek) -> Unit) {
    val today = LocalDate.now()
    val schedule = VirkanSchedule.first { it.dayOfWeek == today.dayOfWeek }
    val week = store.programWeek(today)
    val add = store.weeklyWeightAdd(today)
    val poolDistance = store.currentPoolDistance(today)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            AppHeader(today.format(DateTimeFormatter.ofPattern("d MMMM", Locale("ru"))))
        }
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF18202A))
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Сегодня", color = Gold, fontWeight = FontWeight.SemiBold)
                    Text(schedule.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(scheduleDescription(schedule, store), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (schedule.type != WorkoutDayType.REST) {
                        Button(
                            onClick = { onStartWorkout(schedule.dayOfWeek) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("НАЧАТЬ ТРЕНИРОВКУ")
                        }
                    } else {
                        OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) {
                            Text("СЕГОДНЯ ОТДЫХ")
                        }
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                StatCard("Текущий вес", "${formatNumber(store.currentWeightKg)} кг", Modifier.weight(1f))
                StatCard("Цель", "${formatNumber(store.targetWeightKg)} кг", Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                StatCard("Неделя", week.toString(), Modifier.weight(1f))
                StatCard("К базовым весам", "+${formatNumber(add)} кг", Modifier.weight(1f))
            }
        }
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Filled.Pool, contentDescription = null, tint = Gold)
                        Text("Бассейн", fontWeight = FontWeight.Bold)
                    }
                    Text("Длина дорожки: 50 м")
                    Text("Цель этой недели: $poolDistance м (${poolDistance / 50} дорожек)")
                    Text("База 200 м, затем +50 м каждую неделю", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun PlanScreen(store: VirkanGymStore, onOpenWorkout: (DayOfWeek) -> Unit) {
    val today = LocalDate.now()
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item { AppHeader("Фиксированное расписание недели") }
        items(VirkanSchedule) { day ->
            val complete = day.type != WorkoutDayType.REST && store.isWorkoutComplete(day.dayOfWeek, today)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                onClick = {
                    if (day.type != WorkoutDayType.REST) onOpenWorkout(day.dayOfWeek)
                }
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(day.shortName, color = Gold, fontWeight = FontWeight.Bold)
                    Column(Modifier.weight(1f)) {
                        Text(day.title, fontWeight = FontWeight.SemiBold)
                        Text(
                            when {
                                day.type == WorkoutDayType.REST -> "Восстановление"
                                complete -> "Выполнено"
                                else -> scheduleDescription(day, store)
                            },
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(if (day.type == WorkoutDayType.REST) "—" else if (complete) "✓" else "›", color = if (complete) Color(0xFF70D39A) else Gold)
                }
            }
        }
    }
}

@Composable
private fun WorkoutScreen(
    store: VirkanGymStore,
    selectedDay: DayOfWeek,
    onSelectDay: (DayOfWeek) -> Unit,
    onCompleted: () -> Unit
) {
    val trainingDays = listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY)
    val schedule = VirkanSchedule.first { it.dayOfWeek == selectedDay }
    val week = store.programWeek()
    val checkState = remember(selectedDay, week) { mutableStateMapOf<String, Boolean>() }
    var timerSeconds by rememberSaveable(selectedDay, week) { mutableIntStateOf(90) }
    var timerRunning by rememberSaveable(selectedDay, week) { mutableStateOf(false) }

    LaunchedEffect(timerRunning, timerSeconds) {
        if (timerRunning && timerSeconds > 0) {
            delay(1000)
            timerSeconds -= 1
        } else if (timerSeconds <= 0) {
            timerRunning = false
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { AppHeader("Неделя $week • +${formatNumber(store.weeklyWeightAdd())} кг к базе") }
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                trainingDays.forEach { day ->
                    val label = VirkanSchedule.first { it.dayOfWeek == day }.shortName
                    if (day == selectedDay) {
                        Button(onClick = { onSelectDay(day) }, modifier = Modifier.weight(1f)) { Text(label) }
                    } else {
                        OutlinedButton(onClick = { onSelectDay(day) }, modifier = Modifier.weight(1f)) { Text(label) }
                    }
                }
            }
        }
        item {
            Text(schedule.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
        item {
            TimerCard(
                seconds = timerSeconds,
                running = timerRunning,
                onPreset = { timerSeconds = it; timerRunning = false },
                onToggle = { timerRunning = !timerRunning }
            )
        }

        when (selectedDay) {
            DayOfWeek.MONDAY -> strengthWorkoutItems(
                exercises = MondayExercises,
                store = store,
                checkState = checkState,
                onSetDone = { timerSeconds = 90; timerRunning = true }
            )
            DayOfWeek.THURSDAY -> strengthWorkoutItems(
                exercises = ThursdayExercises,
                store = store,
                checkState = checkState,
                onSetDone = { timerSeconds = 90; timerRunning = true }
            )
            DayOfWeek.TUESDAY -> {
                item { BodyweightExerciseCard(MondayExercises.first(), checkState, onSetDone = { timerSeconds = 90; timerRunning = true }) }
                item { CardioCard() }
                item { PoolCard(store) }
                item { BodyweightExerciseCard(MondayExercises.last(), checkState, onSetDone = { timerSeconds = 90; timerRunning = true }) }
            }
            DayOfWeek.SATURDAY -> {
                strengthWorkoutItems(
                    exercises = SaturdayExercises.dropLast(1),
                    store = store,
                    checkState = checkState,
                    onSetDone = { timerSeconds = 90; timerRunning = true }
                )
                item { PoolCard(store) }
                item { BodyweightExerciseCard(SaturdayExercises.last(), checkState, onSetDone = { timerSeconds = 90; timerRunning = true }) }
            }
            else -> item { Text("Сегодня отдых") }
        }

        item {
            Button(
                onClick = {
                    store.markWorkoutComplete(selectedDay)
                    onCompleted()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("ЗАВЕРШИТЬ ТРЕНИРОВКУ")
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.strengthWorkoutItems(
    exercises: List<ExerciseTemplate>,
    store: VirkanGymStore,
    checkState: MutableMap<String, Boolean>,
    onSetDone: () -> Unit
) {
    itemsIndexed(exercises, key = { index, exercise -> "${exercise.id}_$index" }) { _, exercise ->
        if (exercise.weighted) {
            WeightedExerciseCard(exercise, store, checkState, onSetDone)
        } else {
            BodyweightExerciseCard(exercise, checkState, onSetDone)
        }
    }
}

@Composable
private fun WeightedExerciseCard(
    exercise: ExerciseTemplate,
    store: VirkanGymStore,
    checkState: MutableMap<String, Boolean>,
    onSetDone: () -> Unit
) {
    val base = store.baseWeight(exercise.id)
    val current = store.currentExerciseWeight(exercise.id)
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(exercise.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Text("${exercise.muscle} • ${exercise.sets} подхода × ${exercise.reps} повторов", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                StatCard("Базовый вес", if (base > 0f) "${formatNumber(base)} кг" else "Не задан", Modifier.weight(1f))
                StatCard("Эта неделя", if (current > 0f) "${formatNumber(current)} кг" else "—", Modifier.weight(1f))
            }
            if (base <= 0f) {
                Text("Задайте базовый вес в Настройки → Базовые веса всех упражнений.", color = Gold)
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
            repeat(exercise.sets) { index ->
                val key = "${exercise.id}_${index + 1}"
                val checked = checkState[key] == true
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Подход ${index + 1}", modifier = Modifier.weight(1f))
                    Text(if (current > 0f) "${formatNumber(current)} кг × ${exercise.reps}" else "${exercise.reps} повторов")
                    Checkbox(
                        checked = checked,
                        onCheckedChange = {
                            checkState[key] = it
                            if (it) onSetDone()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun BodyweightExerciseCard(
    exercise: ExerciseTemplate,
    checkState: MutableMap<String, Boolean>,
    onSetDone: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF16202B))
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(exercise.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Text("${exercise.sets} подхода × ${exercise.reps} повторов", color = MaterialTheme.colorScheme.onSurfaceVariant)
            repeat(exercise.sets) { index ->
                val key = "${exercise.id}_${index + 1}_${exercise.name}"
                val checked = checkState[key] == true
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("Подход ${index + 1}", Modifier.weight(1f))
                    Text("${exercise.reps} повторов")
                    Checkbox(
                        checked = checked,
                        onCheckedChange = {
                            checkState[key] = it
                            if (it) onSetDone()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun CardioCard() {
    var km by rememberSaveable { mutableStateOf("3.0") }
    var minutes by rememberSaveable { mutableStateOf("35") }
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Кардио", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = km,
                    onValueChange = { km = decimalFilter(it) },
                    label = { Text("Дистанция, км") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = minutes,
                    onValueChange = { minutes = digitsOnly(it) },
                    label = { Text("Время, мин") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun PoolCard(store: VirkanGymStore) {
    val target = store.currentPoolDistance()
    var minutes by rememberSaveable { mutableStateOf("") }
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Filled.Pool, contentDescription = null, tint = Gold)
                Text("Бассейн", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            }
            Text("Длина бассейна: 50 м")
            Text("Дистанция этой недели: $target м", fontWeight = FontWeight.SemiBold)
            Text("Количество дорожек: ${target / 50}")
            Text("Стиль: произвольный", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Прогрессия: база 200 м + 50 м каждую неделю", color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(
                value = minutes,
                onValueChange = { minutes = digitsOnly(it) },
                label = { Text("Фактическое время, мин") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun TimerCard(seconds: Int, running: Boolean, onPreset: (Int) -> Unit, onToggle: () -> Unit) {
    val mins = seconds / 60
    val secs = seconds % 60
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Таймер отдыха", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(String.format(Locale.US, "%02d:%02d", mins, secs), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                TextButton(onClick = { onPreset(60) }) { Text("1:00") }
                TextButton(onClick = { onPreset(90) }) { Text("1:30") }
                TextButton(onClick = { onPreset(120) }) { Text("2:00") }
                Button(onClick = onToggle) { Text(if (running) "Пауза" else "Старт") }
            }
        }
    }
}

@Composable
private fun ProgressScreen(store: VirkanGymStore, onChanged: () -> Unit) {
    var newWeight by remember { mutableStateOf(formatNumber(store.currentWeightKg)) }
    val entries = store.weightEntries().sortedByDescending { it.epochDay }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { AppHeader("Вес и прогресс программы") }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                StatCard("Текущий вес", "${formatNumber(store.currentWeightKg)} кг", Modifier.weight(1f))
                StatCard("Цель", "${formatNumber(store.targetWeightKg)} кг", Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                StatCard("Неделя", store.programWeek().toString(), Modifier.weight(1f))
                StatCard("Прибавка", "+${formatNumber(store.weeklyWeightAdd())} кг", Modifier.weight(1f))
            }
        }
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Добавить текущий вес", fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = newWeight,
                        onValueChange = { newWeight = decimalFilter(it) },
                        label = { Text("Вес, кг") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = {
                            newWeight.replace(',', '.').toFloatOrNull()?.let {
                                store.addWeightEntry(it)
                                onChanged()
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("СОХРАНИТЬ ВЕС") }
                }
            }
        }
        item { Text("Последние замеры", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        items(entries.take(10)) { entry ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(LocalDate.ofEpochDay(entry.epochDay).format(DateTimeFormatter.ofPattern("dd.MM.yyyy")), Modifier.weight(1f))
                    Text("${formatNumber(entry.weightKg)} кг", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(store: VirkanGymStore, onChanged: () -> Unit) {
    val context = LocalContext.current
    var height by remember { mutableStateOf(store.heightCm.toString()) }
    var weight by remember { mutableStateOf(formatNumber(store.currentWeightKg)) }
    var target by remember { mutableStateOf(formatNumber(store.targetWeightKg)) }
    var startEpoch by remember { mutableStateOf(store.programStartEpochDay) }
    val baseValues = remember {
        mutableStateMapOf<String, String>().apply {
            AllWeightedExercises.forEach { ex ->
                val value = store.baseWeight(ex.id)
                put(ex.id, if (value == 0f) "" else formatNumber(value))
            }
        }
    }

    val startDate = LocalDate.ofEpochDay(startEpoch)
    val datePicker = remember(startEpoch) {
        DatePickerDialog(
            context,
            { _, year, month, day ->
                startEpoch = LocalDate.of(year, month + 1, day)
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    .toEpochDay()
            },
            startDate.year,
            startDate.monthValue - 1,
            startDate.dayOfMonth
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { AppHeader("Настройки Virkan Gym") }
        item { SectionTitle("Профиль") }
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = height,
                        onValueChange = { height = digitsOnly(it) },
                        label = { Text("Рост, см") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = weight,
                        onValueChange = { weight = decimalFilter(it) },
                        label = { Text("Текущий вес, кг") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = target,
                        onValueChange = { target = decimalFilter(it) },
                        label = { Text("Целевой вес, кг") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = {
                            height.toIntOrNull()?.let { store.heightCm = it }
                            weight.replace(',', '.').toFloatOrNull()?.let { store.currentWeightKg = it }
                            target.replace(',', '.').toFloatOrNull()?.let { store.targetWeightKg = it }
                            onChanged()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("СОХРАНИТЬ ПРОФИЛЬ") }
                }
            }
        }
        item { SectionTitle("Программа прогрессии") }
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Дата начала первой недели")
                    OutlinedButton(onClick = { datePicker.show() }, modifier = Modifier.fillMaxWidth()) {
                        Text(LocalDate.ofEpochDay(startEpoch).format(DateTimeFormatter.ofPattern("dd.MM.yyyy")))
                    }
                    Text("Каждые 7 дней силовые веса увеличиваются на 2,5 кг, а дистанция бассейна — на 50 м.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Сейчас: неделя ${store.programWeek()} • +${formatNumber(store.weeklyWeightAdd())} кг", fontWeight = FontWeight.SemiBold)
                    Button(
                        onClick = {
                            store.programStartEpochDay = startEpoch
                            onChanged()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("СОХРАНИТЬ ДАТУ НАЧАЛА") }
                }
            }
        }
        item { SectionTitle("Базовые веса всех упражнений") }
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Введите стартовый вес каждого упражнения один раз. Virkan Gym автоматически добавит +2,5 кг каждую новую неделю.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    AllWeightedExercises.forEach { ex ->
                        OutlinedTextField(
                            value = baseValues[ex.id].orEmpty(),
                            onValueChange = { baseValues[ex.id] = decimalFilter(it) },
                            label = { Text(ex.name) },
                            supportingText = { Text(ex.muscle) },
                            suffix = { Text("кг") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    Button(
                        onClick = {
                            val values = AllWeightedExercises.associate { ex ->
                                ex.id to (baseValues[ex.id].orEmpty().replace(',', '.').toFloatOrNull() ?: 0f)
                            }
                            store.saveBaseWeights(values)
                            onChanged()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("СОХРАНИТЬ БАЗОВЫЕ ВЕСА") }
                }
            }
        }
        item { SectionTitle("Бассейн") }
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SettingRow("Длина бассейна", "50 м")
                    SettingRow("Базовая дистанция", "200 м")
                    SettingRow("Прибавка", "+50 м / неделя")
                    SettingRow("Стиль", "Произвольный")
                    HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
                    Text("Цель текущей недели: ${store.currentPoolDistance()} м (${store.currentPoolDistance() / 50} дорожек)", fontWeight = FontWeight.SemiBold)
                }
            }
        }
        item { Spacer(Modifier.height(20.dp)) }
    }
}

@Composable
private fun StatCard(title: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(14.dp)) {
            Text(title, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
}

@Composable
private fun SettingRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}

private fun scheduleDescription(day: ScheduleDay, store: VirkanGymStore): String = when (day.type) {
    WorkoutDayType.STRENGTH -> "Пресс → силовая тренировка → пресс"
    WorkoutDayType.CARDIO_POOL -> "Пресс → кардио → бассейн ${store.currentPoolDistance()} м → пресс"
    WorkoutDayType.STRENGTH_POOL -> "Пресс → ноги → бассейн ${store.currentPoolDistance()} м → пресс"
    WorkoutDayType.REST -> "Восстановление"
}

private fun formatNumber(value: Float): String =
    if (value == value.roundToInt().toFloat()) value.roundToInt().toString()
    else String.format(Locale.US, "%.1f", value)

private fun decimalFilter(value: String): String = value.filter { it.isDigit() || it == '.' || it == ',' }.take(7)
private fun digitsOnly(value: String): String = value.filter { it.isDigit() }.take(5)
