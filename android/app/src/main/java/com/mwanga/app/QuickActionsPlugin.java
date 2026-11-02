package com.mwanga.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.speech.RecognizerIntent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;

/**
 * Launcher shortcuts (long-press the Mwanga icon) and voice entry.
 *
 * Voice uses the system speech screen (RecognizerIntent), so the app needs no microphone
 * permission: the Google speech service records and returns only the text.
 */
@CapacitorPlugin(name = "QuickActions")
public class QuickActionsPlugin extends Plugin {

    static final String ACTION_QUICK_ADD = "com.mwanga.app.action.QUICK_ADD";
    static final String EXTRA_MODE = "mode";

    @Override
    public void load() {
        Activity activity = getActivity();
        Intent intent = activity == null ? null : activity.getIntent();
        if (deliverShortcut(intent)) {
            // Don't open the same shortcut again if the activity is recreated.
            activity.setIntent(new Intent(Intent.ACTION_MAIN));
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        deliverShortcut(intent);
    }

    /** Emits "shortcut" (kept until the WebView listens) with mode voice | expense | income. */
    private boolean deliverShortcut(Intent intent) {
        if (intent == null || !ACTION_QUICK_ADD.equals(intent.getAction())) return false;
        String mode = intent.getStringExtra(EXTRA_MODE);
        JSObject data = new JSObject();
        data.put("mode", mode == null ? "expense" : mode);
        notifyListeners("shortcut", data, true);
        return true;
    }

    @PluginMethod
    public void listen(PluginCall call) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("language", "pt-PT"));
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        String prompt = call.getString("prompt");
        if (prompt != null) intent.putExtra(RecognizerIntent.EXTRA_PROMPT, prompt);
        try {
            startActivityForResult(call, intent, "speechResult");
        } catch (ActivityNotFoundException e) {
            call.reject("Speech recognition is not available on this device", "UNAVAILABLE");
        }
    }

    @ActivityCallback
    private void speechResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        ArrayList<String> matches = data == null ? null : data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (result.getResultCode() != Activity.RESULT_OK || matches == null || matches.isEmpty()) {
            call.reject("No speech recognised", "CANCELLED");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("text", matches.get(0));
        ret.put("alternatives", new JSArray(matches));
        call.resolve(ret);
    }
}
