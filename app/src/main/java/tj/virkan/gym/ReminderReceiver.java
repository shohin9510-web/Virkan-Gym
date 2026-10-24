package tj.virkan.gym;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
public final class ReminderReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context c,Intent i){String a=i.getAction();if(ReminderScheduler.ALARM.equals(a)||ReminderScheduler.SNOOZE.equals(a))ReminderScheduler.receive(c,i);else ReminderScheduler.schedule(c);}
}
