package app.mwanga.finance;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    private static MainActivity instance;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }

    public static void onSmsReceived(JSObject data) {
        if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null) {
            // Usamos evaluateJavascript diretamente no WebView para garantir compatibilidade
            final String js = "window.dispatchEvent(new CustomEvent('smsReceived', { detail: " + data.toString() + " }));";
            instance.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    instance.getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
        }
    }
}
