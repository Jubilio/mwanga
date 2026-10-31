package com.mwanga.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.provider.Telephony;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;

/**
 * Reads only mobile money and bank SMS from the inbox.
 *
 * The filter runs in the SQL query, so personal messages never leave Android's SMS
 * provider and never reach the WebView. checkPermissions / requestPermissions come
 * from the Capacitor Plugin base class under the "sms" alias.
 */
@CapacitorPlugin(
    name = "MoneySms",
    permissions = { @Permission(strings = { Manifest.permission.READ_SMS }, alias = "sms") }
)
public class MoneySmsPlugin extends Plugin {

    private static final String PLAY_STORE = "com.android.vending";
    private static final int MAX_PATTERNS = 40;
    private static final int MAX_COUNT = 500;

    /** Android version and installer, so the app knows when "restricted settings" applies. */
    @PluginMethod
    public void getInfo(PluginCall call) {
        String installer = null;
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                installer = pm.getInstallSourceInfo(pkg).getInstallingPackageName();
            } else {
                installer = pm.getInstallerPackageName(pkg);
            }
        } catch (Exception ignored) {
            // Unknown installer: treat as installed outside the Play Store.
        }

        JSObject ret = new JSObject();
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        ret.put("installer", installer);
        ret.put("fromPlayStore", PLAY_STORE.equals(installer));
        call.resolve(ret);
    }

    /** Opens this app's page in Android settings (Permissions, and the ⋮ menu for restricted settings). */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open app settings", e);
        }
    }

    /**
     * Lists inbox SMS received since minDate whose sender matches one of `senders`
     * or whose body contains one of `bodyMarkers` (case-insensitive substrings).
     * Refuses to run without patterns, so it can never return the whole inbox.
     */
    @PluginMethod
    public void listMessages(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission not granted", "PERMISSION_DENIED");
            return;
        }

        List<String> senders = readPatterns(call.getArray("senders"));
        List<String> bodyMarkers = readPatterns(call.getArray("bodyMarkers"));
        if (senders.isEmpty() && bodyMarkers.isEmpty()) {
            call.reject("At least one sender or body marker is required", "NO_FILTER");
            return;
        }

        long minDate = call.getLong("minDate", 0L);
        int maxCount = Math.max(1, Math.min(call.getInt("maxCount", 200), MAX_COUNT));

        List<String> args = new ArrayList<>();
        List<String> matches = new ArrayList<>();
        for (String sender : senders) {
            matches.add(Telephony.Sms.ADDRESS + " LIKE ?");
            args.add("%" + sender + "%");
        }
        for (String marker : bodyMarkers) {
            matches.add(Telephony.Sms.BODY + " LIKE ?");
            args.add("%" + marker + "%");
        }
        String selection = Telephony.Sms.DATE + " >= ? AND (" + String.join(" OR ", matches) + ")";
        args.add(0, String.valueOf(minDate));

        String[] projection = { Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE };
        JSArray list = new JSArray();
        try (
            Cursor cursor = getContext()
                .getContentResolver()
                .query(
                    Telephony.Sms.Inbox.CONTENT_URI,
                    projection,
                    selection,
                    args.toArray(new String[0]),
                    Telephony.Sms.DATE + " DESC LIMIT " + maxCount
                )
        ) {
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    JSObject sms = new JSObject();
                    sms.put("id", cursor.getLong(0));
                    sms.put("address", cursor.getString(1));
                    sms.put("body", cursor.getString(2));
                    sms.put("date", cursor.getLong(3));
                    list.put(sms);
                }
            }
        } catch (Exception e) {
            call.reject("Could not read SMS", e);
            return;
        }

        JSObject ret = new JSObject();
        ret.put("smsList", list);
        call.resolve(ret);
    }

    private static List<String> readPatterns(JSArray array) {
        List<String> out = new ArrayList<>();
        if (array == null) return out;
        for (int i = 0; i < array.length() && out.size() < MAX_PATTERNS; i++) {
            try {
                String value = array.getString(i);
                // LIKE wildcards are stripped so a pattern can't widen the match.
                String clean = value == null ? "" : value.replace("%", "").replace("_", "").trim();
                if (clean.length() >= 3) out.add(clean);
            } catch (JSONException ignored) {
                // Skip non-string entries.
            }
        }
        return out;
    }
}
