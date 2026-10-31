package com.mwanga.app;

import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebStorage;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String PREFS = "mwanga-app";
    private static final String KEY_INSTALLED_AT = "installed-at";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        clearWebStorageAfterUpdate();
        super.onCreate(savedInstanceState);
    }

    // Older builds registered a service worker inside the WebView. It keeps serving
    // the web files cached by that build, so after an update the app still runs the
    // old version. Wipe the WebView's storage once per install/update, before the
    // WebView loads. The session token is in secure storage and is not affected.
    private void clearWebStorageAfterUpdate() {
        long installedAt;
        try {
            installedAt = getPackageManager().getPackageInfo(getPackageName(), 0).lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (prefs.getLong(KEY_INSTALLED_AT, 0L) == installedAt) {
            return;
        }

        WebStorage.getInstance().deleteAllData();
        prefs.edit().putLong(KEY_INSTALLED_AT, installedAt).apply();
    }
}
