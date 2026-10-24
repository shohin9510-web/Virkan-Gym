package tj.virkan.gym;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import org.json.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
/** Local reminder planner. Never stores profile, measurements or exercise weights. */
public final class ReminderScheduler {
 static final String ALARM="tj.virkan.gym.REMIND",SNOOZE="tj.virkan.gym.SNOOZE",CHANNEL="training_reminders_v1";
 static final int REQUEST=4100,NOTICE=6100;
 static final String[] KINDS={"plan","workout","unfinished","pool"};
 private ReminderScheduler(){}
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("virkan_reminders_v1",Context.MODE_PRIVATE);}
 static JSONObject read(SharedPreferences p,String key){try{return new JSONObject(p.getString(key,"{}"));}catch(Exception e){return new JSONObject();}}
 static void channels(Context c){NotificationChannel ch=new NotificationChannel(CHANNEL,"План и напоминания о тренировках",NotificationManager.IMPORTANCE_HIGH);ch.setDescription("Дни и время из настроек Virkan Gym");ch.enableVibration(true);ch.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);c.getSystemService(NotificationManager.class).createNotificationChannel(ch);}
 public static boolean allowed(Context c){return (Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)&&c.getSystemService(NotificationManager.class).areNotificationsEnabled();}
 public static boolean exactAllowed(Context c){return Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();}
 public static synchronized void update(Context c,String text){try{if(text==null||text.length()>1500000)return;JSONObject data=new JSONObject(text);JSONArray vs=data.getJSONArray("versions");if(data.optInt("format")!=1||vs.length()<1||vs.length()>1000)return;LocalDate.parse(data.getString("startDate"));data.getJSONObject("config");for(int i=0;i<vs.length();i++){JSONObject v=vs.getJSONObject(i);LocalDate.parse(v.getString("effectiveFrom"));LocalDate.parse(v.getString("anchorDate"));if(v.getJSONArray("cycles").length()!=3)return;}prefs(c).edit().putString("data",data.toString()).apply();c.getSystemService(NotificationManager.class).cancel(NOTICE);schedule(c);}catch(Exception ignored){}}
 static JSONObject day(JSONObject data,LocalDate date)throws JSONException{
  String d=date.toString();JSONArray sessions=data.optJSONArray("sessions");boolean moved=false;
  if(sessions!=null)for(int i=0;i<sessions.length();i++){JSONObject s=sessions.getJSONObject(i);if(d.equals(s.optString("date"))&&s.optBoolean("training"))return s;if(d.equals(s.optString("originalDate")))moved=true;}
  if(moved)return new JSONObject();JSONArray vs=data.getJSONArray("versions");JSONObject selected=vs.getJSONObject(0);
  for(int i=0;i<vs.length();i++){JSONObject v=vs.getJSONObject(i);if(v.getString("effectiveFrom").compareTo(d)<=0&&v.getString("effectiveFrom").compareTo(selected.getString("effectiveFrom"))>=0)selected=v;}
  LocalDate anchor=LocalDate.parse(selected.optString("anchorDate",data.getString("startDate")));int cycle=(int)(Math.max(0,ChronoUnit.DAYS.between(anchor,date)/7)%3);
  return selected.getJSONArray("cycles").getJSONObject(cycle).getJSONObject(String.valueOf(date.getDayOfWeek().getValue()%7));
 }
 static boolean eligible(JSONObject d,String kind){return d.optBoolean("training")&&!d.optBoolean("finished")&&(!"pool".equals(kind)||d.optBoolean("pool")&&!d.optBoolean("poolDone"));}
 static JSONObject event(JSONObject data,LocalDate date,String kind,String time)throws Exception{
  JSONObject d=day(data,date);if(!eligible(d,kind))return null;long at=date.atTime(LocalTime.parse(time)).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
  String title="pool".equals(kind)?"Бассейн после зала":d.optString("title","Тренировка"),prefix="plan".equals(kind)?"Сегодня по плану":"unfinished".equals(kind)?"Тренировка ещё не завершена":"pool".equals(kind)?"Плавание ещё не отмечено":"Время тренировки";
  String details=data.getJSONObject("config").optBoolean("details")?d.optString("details",""):"";
  return new JSONObject().put("at",at).put("date",date.toString()).put("kind",kind).put("title",title).put("key",date+"|"+kind+"|"+time).put("text",prefix+(details.isEmpty()?"":" · "+details));
 }
 static JSONObject next(JSONObject data,long now,String delivered)throws Exception{
  JSONObject cfg=data.getJSONObject("config");if(!cfg.optBoolean("enabled"))return null;JSONObject best=null;LocalDate today=LocalDate.now();
  for(int i=0;i<35;i++){LocalDate date=today.plusDays(i);JSONObject dc=cfg.getJSONObject("days").getJSONObject(String.valueOf(date.getDayOfWeek().getValue()%7));if(!dc.optBoolean("enabled"))continue;for(String k:KINDS){if(!cfg.getJSONObject("types").optBoolean(k))continue;JSONObject e=event(data,date,k,dc.getString(k));if(e==null||e.getLong("at")<=now||e.getString("key").equals(delivered))continue;if(best==null||e.getLong("at")<best.getLong("at"))best=e;}if(best!=null)break;}return best;
 }
 static PendingIntent pending(Context c){return PendingIntent.getBroadcast(c,REQUEST,new Intent(c,ReminderReceiver.class).setAction(ALARM),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 public static synchronized void schedule(Context c){AlarmManager am=c.getSystemService(AlarmManager.class);am.cancel(pending(c));SharedPreferences p=prefs(c);JSONObject data=read(p,"data");p.edit().remove("next").apply();try{if(!data.getJSONObject("config").optBoolean("enabled")){p.edit().remove("snooze").apply();return;}long now=System.currentTimeMillis();JSONObject e=next(data,now,p.getString("delivered","")),sn=read(p,"snooze");if(sn.optLong("at")>now&&eligible(day(data,LocalDate.parse(sn.getString("date"))),sn.optString("kind"))){if(e==null||sn.getLong("at")<e.getLong("at"))e=sn;}else p.edit().remove("snooze").apply();if(e==null)return;p.edit().putString("next",e.toString()).apply();long at=e.getLong("at");try{if(data.getJSONObject("config").optBoolean("exact")&&exactAllowed(c))am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c));else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c));}catch(SecurityException ex){am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c));}}catch(Exception ignored){p.edit().remove("next").apply();}}
 static PendingIntent open(Context c,String date){Intent i=new Intent(c,MainActivity.class).setAction("OPEN_TRAINING").setData(Uri.parse("virkangym://workout/"+date)).putExtra("trainingDate",date).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);return PendingIntent.getActivity(c,6101,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static void show(Context c,JSONObject e){
  if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;if(!allowed(c))return;channels(c);
  String date=e.optString("date",LocalDate.now().toString());Notification.Builder b=new Notification.Builder(c,CHANNEL).setSmallIcon(R.drawable.ic_notification).setContentTitle(e.optString("title","Virkan Gym")).setContentText(e.optString("text","Сегодня по плану")).setStyle(new Notification.BigTextStyle().bigText(e.optString("text"))).setContentIntent(open(c,date)).setAutoCancel(true).setCategory(Notification.CATEGORY_REMINDER).setVisibility(Notification.VISIBILITY_PRIVATE).addAction(new Notification.Action.Builder(null,"Открыть тренировку",open(c,date)).build());
  Intent snooze=new Intent(c,ReminderReceiver.class).setAction(SNOOZE).putExtra("event",e.toString());b.addAction(new Notification.Action.Builder(null,"Через 30 минут",PendingIntent.getBroadcast(c,4101,snooze,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)).build());try{c.getSystemService(NotificationManager.class).notify(NOTICE,b.build());}catch(SecurityException ignored){}
 }
 public static synchronized void receive(Context c,Intent i){SharedPreferences p=prefs(c);JSONObject data=read(p,"data");try{if(SNOOZE.equals(i.getAction())){JSONObject e=new JSONObject(i.getStringExtra("event"));if(!data.getJSONObject("config").optBoolean("enabled"))return;e.put("at",System.currentTimeMillis()+30*60000L).put("key",e.optString("key")+"|snooze");p.edit().putString("snooze",e.toString()).apply();c.getSystemService(NotificationManager.class).cancel(NOTICE);schedule(c);return;}JSONObject e=read(p,"next");if(e.optLong("at",Long.MAX_VALUE)>System.currentTimeMillis()+2000){schedule(c);return;}if(data.getJSONObject("config").optBoolean("enabled")&&LocalDate.now().toString().equals(e.optString("date"))&&eligible(day(data,LocalDate.now()),e.optString("kind"))&&!e.optString("key").equals(p.getString("delivered",""))){show(c,e);p.edit().putString("delivered",e.optString("key")).apply();}if(e.optString("key").contains("|snooze"))p.edit().remove("snooze").apply();}catch(Exception ignored){}schedule(c);}
 public static void test(Context c){try{JSONObject today=day(read(prefs(c),"data"),LocalDate.now());show(c,new JSONObject().put("date",LocalDate.now().toString()).put("title",today.optBoolean("training")?today.optString("title"):"Virkan Gym — сегодня отдых").put("text","Проверка уведомлений. Дни и время задаются в настройках.").put("kind","plan").put("key","test"));}catch(Exception ignored){}}
 public static String status(Context c){try{return new JSONObject().put("allowed",allowed(c)).put("exact",exactAllowed(c)).put("next",read(prefs(c),"next")).toString();}catch(Exception e){return "{}";}}
}
