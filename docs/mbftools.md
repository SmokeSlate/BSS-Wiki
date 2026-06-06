# MBF Tools and Setup

**MBF Tools** is a open source app for Meta Quest that combines the full Beat Saber modding setup flow into a simple interface.

## Instructions

### 1. Install MBF Tools

1. Open the web browser on your Quest.
2. Go to **https://mbf.tools** and tap **Download APK**.
3. Open the **Files** app, tap **Downloads**, tap the `...` next to the APK, and choose **Package installer**.
4. Enable unknown sources when prompted and tap **Install**.
5. Find **MBF Tools and Setup** under **Unknown Sources** in your app library.

### 2. Run the guided setup

1. Open **MBF Tools and Setup**.
2. Follow the on-screen wizard. It will:
   - Check if Android developer mode is on (and guide you to enable it if not).
   - Open Wireless Debugging for you.
   - Prompt you to enter the 6-digit pairing code.
3. The app detects the pairing and debug ports automatically. No manual entry needed.

### 3. Launch MBF

Once paired, tap **Launch MBF In This App**. The MBF mod loader opens inside the built-in browser with the native bridge running — you're ready to mod Beat Saber.

---

## Troubleshooting

**Setup wizard is stuck on "Android dev mode not detected"**
- Tap **Build Number** 7 times on the *About Headset* screen in Android Settings.
- The app opens Android Settings for you via the **Open Settings App Info** button.

**Wireless Debugging pairing fails**
- Make sure Wireless Debugging is **on** and you tapped **Pair with pairing code** before entering the code.
- The pairing code expires quickly — request a new one if needed.

**MBF won't launch**
- Ensure the ADB connection is established (green status) before tapping Launch.
- If the status shows "Not connected," tap **Refresh Connection** or re-run pairing.

For any other issues, use the **Share Debug Logs** button inside the app to generate a support code, then post it in [Discord](https://d.sm0ke.org) or the [Support Chat]( https://wiki.sm0ke.org/support/).

---

## Source & releases

- **Site:** [mbf.tools](https://mbf.tools)
- **GitHub:** [github.com/SmokeSlate/MBF-Tools](https://github.com/SmokeSlate/MBF-Tools)
- **Latest release:** [github.com/SmokeSlate/MBF-Tools/releases/latest](https://github.com/SmokeSlate/MBF-Tools/releases/latest)
- Licensed under MIT.
