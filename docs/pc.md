# PC Modding

::: tip Recommended method
**BSManager** handles everything — instances, mods, and custom songs — in one app. It's the easiest way to mod Beat Saber on PC.
:::

## Requirements

Before you start, make sure your PC meets the requirements on the [PC Preparations](/prePC) page. Beat Saber must already be installed through Steam or the Meta PC app.

---

## BSManager

### 1. Download & Install BSManager

Download the latest release from the official site:

**[Download BSManager → bsmanager.io](https://www.bsmanager.io/download)**

Run the installer and open BSManager once it finishes.

### 2. Create a Beat Saber Instance

1. Click **Add instance** (or the **+** button).
2. BSManager will detect your installed Beat Saber version automatically.
    - If it doesn't detect it, point BSManager to your Beat Saber folder manually.
3. Select **1.40.7** (current recommended moddable version) from the version list if you want to start fresh, or use your existing installation.
4. Click **Launch** to confirm the instance is working before adding mods.

### 3. Install Mods

1. Select your instance and open the **Mods** tab.
2. BSManager loads the available mod list from BeatMods automatically.
3. Tick the mods you want — see [Recommended PC Mods](/modsPC) for suggestions.
4. Click **Install / Update**.
5. Wait for each mod to report success, then close BSManager.

::: tip
Install **BeatSaverDownloader** first — it adds an in-game browser so you can download custom songs without leaving Beat Saber.
:::

### 4. Install Custom Songs

**Option A — In-game (recommended)**
1. Launch Beat Saber through BSManager.
2. In the main menu, go to **Custom Levels** → **Get More Songs** (requires BeatSaverDownloader).
3. Search, preview, and download maps directly from [BeatSaver](https://beatsaver.com).

**Option B — BSManager**
1. Open the **Maps** tab inside your instance.
2. Search BeatSaver from there and click **Download**.

**Option C — Browser**
1. Visit **[beatsaver.com](https://beatsaver.com)** in your browser.
2. Click **Download** on any map — it opens in BSManager automatically if the BeatSaver protocol handler is installed.

### 5. Custom Sabers, Avatars & Platforms

Install **Custom Sabers**, **Custom Avatars**, or **Custom Platforms** from the Mods tab, then:

- Drop saber files (`.saber`) into `Beat Saber/CustomSabers/`
- Drop avatar files (`.avatar`) into `Beat Saber/CustomAvatars/`
- Drop platform files (`.plat`) into `Beat Saber/CustomPlatforms/`

In-game, go to **⚙️ → Mod Settings** to switch active sabers, avatars, and platforms.

---

## Troubleshooting

**Mods are gone after a Beat Saber update**
- Steam and the Meta PC app update Beat Saber automatically and wipe mods. Open BSManager, go to the Mods tab, and click **Install / Update** again to reinstall them.
- To prevent auto-updates: in Steam, right-click Beat Saber → Properties → Updates → set to *Only update when I launch this game*. Always launch through BSManager instead.

**Custom songs don't show in-game**
- Make sure **SongCore** is installed (BSManager installs it as a dependency automatically if you pick any map-playing mods).
- Songs live in `Beat Saber/CustomLevels/`. Each song must be in its own subfolder.
- Restart Beat Saber and wait for SongCore to finish loading (progress bar in the main menu).

**Game crashes on launch after modding**
- One or more mods may be incompatible with your Beat Saber version. Open BSManager → Mods → click **Repair** or remove recently installed mods one at a time until the game launches.
- Check the `Beat Saber/Logs/` folder for error lines starting with `[Error]` or `[Critical]`.

**BSManager can't find my Beat Saber installation**
- Make sure Beat Saber is installed and has been launched at least once.
- Manually set the path in BSManager settings if auto-detection fails.

::: warning Still stuck?
Ask in [Discord](https://d.sm0ke.org) or the [Support Chat](https://wiki.sm0ke.org/support/). Include your Beat Saber version, a list of installed mods, and any error messages you see.
:::
