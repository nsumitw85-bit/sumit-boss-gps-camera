package com.sumitboss.gpscamera;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SumitMediaPlugin.class);
        registerPlugin(SumitVoicePlugin.class);
        registerPlugin(ImageStampModule.class);
        super.onCreate(savedInstanceState);

        // Automatically start the AI neural welcome voice ("सुमित बॉस ॲप्लिकेशनमध्ये आपले स्वागत आहे.") when app opens
        SumitVoicePlugin.playWelcomeVoice(this.getApplicationContext());
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        SumitVoicePlugin.cleanup();
    }
}
