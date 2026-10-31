package com.mwanga.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MoneySmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
