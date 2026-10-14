package com.sumitboss.gpscamera;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SumitMediaPlugin.class);
        registerPlugin(SumitVoicePlugin.class);
        super.onCreate(savedInstanceState);

        // Automatically start the welcome voice ("Welcome to Sumit Boss.") when app opens
        SumitVoicePlugin.startWelcomeVoice(this.getApplicationContext());
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        SumitVoicePlugin.cleanup();
    }
}
