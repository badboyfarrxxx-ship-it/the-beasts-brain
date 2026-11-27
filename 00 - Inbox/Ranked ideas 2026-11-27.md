---
status: active
project: meta
type: synthesis
created: 2026-11-27
---

## 1. Test the VLC 4 build on the Surface

- **Why it ranks where it does:** Nathan built and published VLC 4 through the new GitHub build pipeline (run 5 fixed the exit cleanup bug, and zip releases are ready on the repo), but it still needs a real test on the Surface to confirm the migration from the old broken dev build is fully complete.
- **Blocked on:** Nathan testing the build on the Surface.

## 2. Install the HP NVIDIA graphics driver

- **Why it ranks where it does:** The HP currently runs on Windows' software renderer because its GeForce 710A has no GPU driver, which skews performance testing and leaves 3D applications running poorly. Installing the R470 branch driver unblocks proper hardware validation.
- **Blocked on:** Nathan completing the driver installation and running a re-test.

## 3. Host the Undermoot demo on Cloudflare Pages

- **Why it ranks where it does:** The installable web app (PWA) and demo builds of Undermoot are finished and tested, but the demo needs an accessible hosting provider with HTTPS to enable real installs, and Cloudflare Pages direct upload was chosen as the best fit to keep the repository private.
- **Blocked on:** Nathan creating the Cloudflare account and setting up the direct upload.

## 4. Set up the Undermoot itch.io store page

- **Why it ranks where it does:** The sales research and store mechanics are specced out in [[Selling Undermoot]], and the demo is ready, but the actual launch is waiting on creating the store page and connecting the demo's `storeUrl` so the "Get the full game" button becomes visible.
- **Blocked on:** Nathan creating the itch.io account and deciding on the launch details.

## 5. Gather outside playtesters and measure play time for Undermoot

- **Why it ranks where it does:** Step 0 of the sales plan requires outside playtesters and measured play time before a commercial release, and the automated playtime measurement script (`scripts/measure-playtime.mjs`) currently fails and is marked broken.
- **Blocked on:** Fixing the playtime measurement loop and getting feedback from outside testers.

## 6. Fix the Undermoot automated playtime measurement script

- **Why it ranks where it does:** The playtime script currently reports incorrect core-burning loops instead of actual game progression, blocking the objective measurement needed to price and tune the game's release length accurately.
- **Blocked on:** Debugging the health parsing and simulation loop in `scripts/measure-playtime.mjs`.

## 7. Complete the remaining app-side camera configurations for the camera wall

- **Why it ranks where it does:** While the eufy camera and the underlying app framework are fully operational, the Smart Life (Tuya) and Yi IoT cameras still need their respective ONVIF settings, firmware checks, or go2rtc bridges configured on the camera hardware side before they can appear on the [[camera-wall]].
- **Blocked on:** Nathan performing the physical camera configuration steps.

---

## What the brief does not say

The brief does not contain the current operational status or contents of the private repositories mentioned (such as `vlc-build`, `colony-game`, `my-agent`, and `backtalk`), nor does it record whether Nathan has already created the requested Cloudflare and itch.io accounts outside of the recorded daily notes. It also does not specify the final decision regarding procedural art quality for selling Undermoot, nor whether the Equifax credit ban mentioned in the credential rotation task was ultimately put into effect.
