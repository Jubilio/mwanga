package app.mwanga.finance;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import com.getcapacitor.JSObject;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                String format = bundle.getString("format");
                if (pdus != null) {
                    for (Object pdu : pdus) {
                        SmsMessage smsMessage;
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                            smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                        } else {
                            smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                        }
                        String body = smsMessage.getMessageBody();
                        String sender = smsMessage.getOriginatingAddress();

                        Log.d(TAG, "SMS Received from: " + sender);

                        // Filter for known financial senders
                        if (isFinancialSender(sender)) {
                            Log.d(TAG, "Financial SMS detected. Forwarding to app...");
                            forwardToApp(context, sender, body);
                        }
                    }
                }
            }
        }
    }

    private boolean isFinancialSender(String sender) {
        if (sender == null) return false;
        String s = sender.toLowerCase();
        return s.contains("m-pesa") || s.contains("emola") || s.contains("bim") || s.contains("bci") || s.contains("mksh");
    }

    private void forwardToApp(Context context, String sender, String body) {
        JSObject ret = new JSObject();
        ret.put("sender", sender);
        ret.put("body", body);

        // We use a global helper or static method in MainActivity to notify the web layer
        MainActivity.onSmsReceived(ret);
    }
}
