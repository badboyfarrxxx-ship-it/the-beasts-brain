---
status: active
project: meta
type: guide
created: 2026-08-29
---

# Building VLC for Windows

How this machine builds [[VLC]] from source into a native Windows binary. First done 2026-08-29. This is a **native MSYS2 build** (compiling on Windows, for Windows) using VLC's **prebuilt contribs** — not VLC's officially supported path, which is cross-compilation from Linux. Because we're off the supported path, several of VLC's build scripts needed small fixes; they are all recorded below so a future session doesn't rediscover them.

> **Being replaced (2026-09-25).** VLC is now built on GitHub by [[VLC build pipeline]]. This MSYS2 method gets marked retired once the new build is confirmed working on the Surface. Kept for the history and the MSYS2 fixes.

## Status

> **After the 2026-09-15 rebuild (checked 2026-09-22): the build environment is gone.** There
> is no `C:\msys64` and no `C:\Users\badbo`, so MSYS2, the toolchain, Qt6, the VLC source
> tree and the `Builds\VLC` run folder no longer exist on this machine. Everything below
> describes the old install. What survived: the two patched source files
> ([[vlc-source-patches]]) and the installer `VLC-4.0-dev-setup.exe` on `E:` (which has no
> drive letter since 2026-09-22; see [[Machine drives]]). Rebuilding the environment is part
> of [[Dev machine setup]] if Nathan wants it.

- **Build environment: working (old install).** MSYS2 + toolchain + Qt6 installed, VLC source cloned, `extras/tools` built, prebuilt contribs installed, `configure` passes with `--disable-dbus --disable-ncurses` and the Qt GUI enabled.
- **`vlc.exe` COMPILES AND THE FULL QT GUI RUNS.** As of 2026-08-29 `make -k` produces `win64/bin/.libs/vlc.exe` (`VLC 4.0.0-dev Otto Chriek`, gcc 16.2), 409 plugin DLLs, and a plugin cache. Getting a runnable GUI took **two small source patches** (below) plus a hand-assembled run folder, because MSYS2's Qt is shared where VLC's contrib Qt is static.
- **The finished build lives at `C:\Users\badbo\Builds\VLC\`** (~1.5 GB, `vlc.exe` + all plugins + Qt runtime + data + `vlc.ico`). Desktop shortcut **"VLC 4.0 (dev build)"** points at it (workdir set, VLC icon). Tested from both the folder and the shortcut — the real VLC 4.0 QML interface, ~200 MB working set, no errors. It was on `G:\Builds\VLC` from 2026-08-29 to 2026-09-01, then moved back to C: (G: is a spinning HDD, so scans and launch dragged); freed the space for it by disabling hibernation and clearing caches. Nathan also has a separate stable VLC installed at `D:\Program Files\VLC`.
- **Distributable installer: `VLC-4.0-dev-setup.exe`** (306 MB, NSIS/MUI2, LZMA), plus its two `.nsi` scripts and a `README.txt`, now live at `E:\programs installs\programs setups\aaaaamy builds\VLC 4.0 dev setup\` (moved off the dead G: drive, see the 2026-09-02 note below). Also copied by File History to `E:\FileHistory\...\Users\badbo\Builds\installer\`. The `.exe` is verified intact (valid PE, sha256 `447a96012660175c827fb5b0840fc725894a3123965e79528e64a7f4e2d3d1f8`). Built with a **custom `.nsi`** (session scratchpad `vlc-dev-installer.nsi`), not VLC's `make package-win32-exe` — that chain wants `make install` to succeed (the `vlc-cache-gen` install-exec-hook breaks it), doesn't gather the shared Qt runtime, and needs a 32-bit toolchain for `nsProcess.dll`. The custom installer wraps `Builds\VLC\` → `$PROGRAMFILES64\VLC 4.0 dev`, Start Menu + optional Desktop shortcut, real uninstaller + Add/Remove entry, GPL license page, **no file associations** (Nathan's stable VLC keeps those). It runs `vlc-cache-gen` post-extract (NSIS re-timestamps files, staling the bundled `plugins.dat`). Full install→launch→uninstall lifecycle verified via a user-level test variant.
- **taglib plugin: FIXED** (2026-08-29). The prebuilt contrib `libtag.a` was built with an emulated-TLS libstdc++ and wouldn't link against MSYS2 GCC 16.2 (`undefined reference to __emutls_v._ZSt11__once_call` from `mp4itemfactory.cpp`'s `std::call_once`). Rebuilt **TagLib 2.3** (the version `contrib/src/taglib/rules.mak` pins, no VLC patches) from source with CMake/GCC 16.2, installed the static lib straight over `contrib/x86_64-w64-mingw32/lib/libtag.a` (old one saved as `libtag.a.emutls-broken.bak`), then force-relinked just `libtaglib_plugin.la` — no reconfigure. New `libtag.a` has 0 emutls refs; the plugin links, loads (shows in `vlc --list`, module count 587 → 600), and has no unmet DLL deps. See "Rebuilding a single contrib lib from source" below.
- **`makensis` (NSIS 3.12): installed** — `mingw-w64-x86_64-nsis` plus `nsis-nsisunz`.
- **2026-09-02: the source tree drive died.** `G:\vlc` (the 6.8 GB MSYS2 source + build tree, git clone + all local patches) was on a USB drive ("Generic STORAGE DEVICE") that suffered NTFS corruption and is now unrecoverable through Windows (see [[Machine drives]]). **The source tree is lost.** What survived: the runnable build on `C:` (untouched), the installer package on `E:` (above), and the two source patches, which File History had captured post-patch and are now saved verbatim at [[vlc-source-patches]] (`04 - Resources/vlc-source-patches/plugin.c` and `winvlc.c`). To build VLC again: re-clone `code.videolan.org/videolan/vlc.git` (`master`, `4.0.0-dev`), re-apply the two patches from those files or the descriptions below, redo the MSYS2 Qt header patches (fix 4) and the two `Makefile.am` / `check_qml_module.py` edits, then Phase 3 onward. Roughly one session.
- **Drive layout (before the 2026-09-02 failure):** source+build tree was **`G:\vlc`** (6.8 GB); the runnable build **`C:\Users\badbo\Builds\VLC\`** (moved back to the SSD 2026-09-01 for launch/scan speed). Moving the runnable folder needs `vlc-cache-gen.exe plugins` re-run at the new path (the bundled `plugins.dat` stores absolute plugin paths — a stale one makes VLC fall back to a windowless CLI) and the Desktop shortcut re-pointed. **Caveat for a future rebuild:** the `win64/` build tree still has the old `/c/Users/badbo/vlc` paths baked into `config.status`, the generated `Makefile`s, and the contrib `.pc` files — an incremental `make` there will misbehave. To rebuild, re-run `./bootstrap` + `configure.sh` from `G:\vlc\win64` (Phase 3), and if contrib paths bite, re-run `contrib/src/change_prefix.sh` inside `contrib/x86_64-w64-mingw32`. The finished `C:\Users\badbo\Builds\VLC` and the installer run fine from anywhere and don't need the source tree.

### The two source patches (reapply after any `git clean` / reclone — a plain rebuild keeps them)

Both address the same thing: VLC 4.0 deliberately restricts DLL loading to `C:\Windows\System32` (a supply-chain-hardening measure). That is fine for the official build, whose Qt and other C++ libs are **statically linked into the plugins**. Our `libqt_plugin.dll` is built against MSYS2's **shared** Qt, so it (and Qt's own QML plugins) need ~33 sibling DLLs that the locked-down loader refuses to find anywhere but System32.

1. **`src/win32/plugin.c`, `vlc_dlopen()`** — before `LoadLibraryExW`, derive the plugin's own directory from the path, `AddDllDirectory()` it (resolved via `GetProcAddress` for the Win7 floor), and load with `LOAD_LIBRARY_SEARCH_SYSTEM32 | LOAD_LIBRARY_SEARCH_USER_DIRS | LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR`, then `RemoveDllDirectory()`. Adds `#include <stdlib.h>` and `#ifndef` fallbacks for the two flag constants. Lets a plugin resolve its dependency DLLs from beside itself. Rebuilds `libvlccore` (~20 s).
2. **`bin/winvlc.c`, ~line 122** — `SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_SYSTEM32)` → `SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_DEFAULT_DIRS | LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR)` (with `#ifndef` fallbacks). `DEFAULT_DIRS` = application dir + System32 + `AddDllDirectory` paths. `SetDllDirectory("")` (no cwd) and `PrioritizeSystem32()` stay. This is what lets Qt's *own* QML plugin loader (`qquicklayoutsplugin.dll` etc., which obey the process-wide setting) find the Qt DLLs next to `vlc.exe`. Rebuilds `bin/vlc.exe` (~20 s). Without it the GUI segfaults loading `MainInterface.qml`.

Nathan approved both edits in the 2026-08-29 session. They mildly relax VLC's DLL hardening — acceptable for a personal build, and the alternative is a 1–2 h from-source contrib-Qt compile.

### Assembling the runnable folder

Built once into `win64/VLC-portable/`, then moved to `C:\Users\badbo\Builds\VLC\`. To rebuild
it, work in a scratch dir and move it when done. Paths below say `VLC-portable/` for the
scratch dir.

`make install` / `make package-win-common` do **not** work here: `package-win-install` runs `make install` (which trips on the unbuilt taglib and, via its `install-exec-hook`, on `vlc-cache-gen` returning non-zero for unloadable plugins), and it also doesn't gather the shared Qt runtime. Assemble by hand instead (script: scratchpad `assemble2.sh` + `wdq2.sh`):

1. Copy `bin/.libs/{vlc.exe,vlc-cache-gen.exe,vlc-preparser.exe}`, `lib/.libs/libvlc.dll`, `src/.libs/libvlccore.dll` → `VLC-portable/`.
2. Copy every `modules/.libs/*_plugin.dll` → `VLC-portable/plugins/` (flat is fine — VLC scans recursively) and `modules/gui/qt/.libs/libqt_plugin.dll` → `VLC-portable/plugins/gui/`, then `strip --strip-unneeded` it (489 MB → ~13 MB).
3. Copy the 33 Qt + support DLLs (from `C:\msys64\mingw64\bin`) **next to `libqt_plugin.dll`** in `plugins/gui/` (patch 1 adds that dir to the search) — and also next to `vlc.exe` (patch 2, for the QML plugins). The 3 mingw runtime DLLs (`libstdc++-6`, `libgcc_s_seh-1`, `libwinpthread-1`) in both places too.
4. `windeployqt6 --release --no-translations --compiler-runtime --dir VLC-portable --plugindir VLC-portable/qtplugins --qml-deploy-dir VLC-portable/qml --qmldir G:/vlc/modules/gui/qt VLC-portable/plugins/gui/libqt_plugin.dll` — pulls in the Qt platform/QML plugin trees.
5. `qt.conf` next to `vlc.exe`: `[Paths]` / `Plugins = qtplugins` / `Qml2Imports = qml`.
6. Data: `_stage/share/vlc/lua` → `VLC-portable/lua`, `_stage/share/vlc/skins2` → `VLC-portable/skins`, `vlc/share/hrtfs/*` → `VLC-portable/hrtfs/`.
7. `cd VLC-portable && ./vlc-cache-gen.exe plugins` (regenerates `plugins/plugins.dat`).
8. `./vlc.exe` — the GUI comes up.

`_stage/` (from the one partial `make install prefix=…` run) is only kept for the lua/skins data in step 6; otherwise disposable.

## What is installed on this machine

- **MSYS2** at `C:\msys64` (installed via `winget install MSYS2.MSYS2`). The Unix environment that ships inside Git for Windows is a stripped-down runtime with no package manager and cannot be used for this.
- **Toolchain** (MSYS2 packages): `base-devel`, `git`, `mingw-w64-x86_64-toolchain` (GCC 16.2, target `x86_64-w64-mingw32`), plus `autoconf automake libtool m4 make patch pkgconf gettext gettext-devel flex bison nasm yasm python help2man gperf` and the mingw64 `cmake ninja meson`.
- **Qt 6.11** (MSYS2 packages): `mingw-w64-x86_64-qt6-base qt6-declarative qt6-svg qt6-shadertools qt6-5compat qt6-tools qt6-imageformats qt6-translations`. See the Qt note below for why MSYS2's Qt is used instead of the one in the prebuilt contribs.
- **VLC source**: cloned at `G:\vlc` (git `code.videolan.org/videolan/vlc.git`, branch `master`, `4.0.0-dev`). The out-of-tree build lives in `G:\vlc\win64`.

## The one rule that makes it work: use the MINGW64 shell

Run every build command through MSYS2's real launcher:

```
C:/msys64/msys2_shell.cmd -mingw64 -defterm -no-start -c "bash <script>"
```

**Do not** use `C:\msys64\usr\bin\bash.exe -lc "..."`. qmake's compiler probe shells out through `cmd.exe`, and only the `msys2_shell.cmd -mingw64` launcher gives that child process a PATH where `g++` is visible. Launched the wrong way, qmake fails with `toolchain.prf:76: Variable QMAKE_CXX.COMPILER_MACROS is not defined` / `failed to parse default include paths from compiler output`, and Qt detection collapses.

## Build sequence

All commands run from the MINGW64 shell (see above). Add `extras/tools/build/bin` to `PATH` and set `CC=gcc CXX=g++`.

### Phase 1 — build tools (`extras/tools`)

```
cd /g/vlc/extras/tools
./bootstrap
make -j4
```

This is the Makefile Nathan originally pasted (`tools.mak`). On this machine only `config.guess/config.sub` and Apache `ant` actually needed building — MSYS2's autoconf/automake/cmake/meson/nasm were current enough. Ends with "You are ready to build VLC and its contribs".

### Phase 2 — contribs (prebuilt)

VLC's `make prebuilt` points at a **retired** server (`download.videolan.org/pub/videolan/contrib/…`, last Windows build 2017, `.tar.bz`). The live prebuilt bundles are at `https://artifacts.videolan.org/vlc/win64/`, named by a contrib hash:

```
cd /g/vlc
SHA=$(sh extras/ci/get-contrib-sha.sh)          # e.g. 275bbed0a08433de13c007bf00f1aad2ebd7acbb
URL="https://artifacts.videolan.org/vlc/win64/vlc-contrib-x86_64-w64-mingw32-$SHA.tar.zst"
cd contrib && mkdir -p win64 && cd win64
../bootstrap --host=x86_64-w64-mingw32
make prebuilt PREBUILT_URL="$URL"
```

**Windows symlink failure on extract:** `tar` cannot create the 3 symlinks in the bundle (`lib/pkgconfig/libpng.pc`, `bin/libpng-config`, `share/libmysofa/default.sofa`) and aborts. Work around it: extract tolerating the error, then materialise those 3 as real copies of their targets (`libpng16.pc`, `libpng16-config`, `MIT_KEMAR_normal_pinna.sofa`), then `mv` the tree into `contrib/x86_64-w64-mingw32` and run `../src/change_prefix.sh` inside it. Result: ~160 static libs, ~104 `.pc` files.

### Phase 3 — configure + compile

```
cd /g/vlc && ./bootstrap
mkdir -p win64 && cd win64
../extras/package/win32/configure.sh --host=x86_64-w64-mingw32 BUILDCC=/mingw64/bin/gcc
make -j4
```

`BUILDCC=/mingw64/bin/gcc` is required — build == host here, so VLC can't auto-detect a separate "native" compiler and aborts with "Cannot find native C99 compiler: please define BUILDCC".

Re-running `configure.sh` after the first `make` is expected on this build — it picks up `makensis` (installed later) and regenerates the Qt Makefiles after the `Makefile.am` edits in fix 5. Safe: it rebuilds nothing already compiled. See the **Packaging** section for what happens after `make` succeeds.

## Fixes applied (needed because this is a native, not cross, build)

1. **luac wrapper.** The contrib ships `luac.exe` (Lua 5.4.4, matches `liblua5.4.a`), but its Windows `stdout` is in text mode, so `luac -o -` corrupts bytecode (`0x0A` → `0x0D 0x0A`) and VLC's configure 64-bit check fails ("You need 64bit luac when using lua from contrib"). A wrapper script placed (executable, no `.exe`) at both `extras/tools/build/bin/luac` and `extras/tools/build/bin/x86_64-w64-mingw32-luac` intercepts the `-o -` case, writes to a temp file, and streams it out through `cat` (binary-safe on MSYS). The wrapper:

```bash
#!/bin/bash
REAL="/g/vlc/contrib/x86_64-w64-mingw32/bin/luac.exe"
out=""; args=(); argv=("$@"); i=0; n=${#argv[@]}
while [ $i -lt $n ]; do
    a="${argv[$i]}"
    if [ "$a" = "-o" ]; then i=$((i+1)); out="${argv[$i]}"; else args+=("$a"); fi
    i=$((i+1))
done
if [ "$out" = "-" ]; then
    tmp="$(mktemp)"; "$REAL" -o "$tmp" "${args[@]}"; rc=$?
    cat "$tmp"; rm -f "$tmp"; exit $rc
elif [ -n "$out" ]; then exec "$REAL" -o "$out" "${args[@]}"
else exec "$REAL" "${args[@]}"; fi
```
2. **`buildsystem/check_qml_module.py` — two edits.** VLC's Windows build normally cross-compiles from Linux, so this script assumes Unix-named host tools and Unix temp-file semantics:
   - `findProgram()` now also tries `progName + ".exe"` (Windows won't exec an extensionless PE, and `qmlimportscanner` is `qmlimportscanner.exe`).
   - The temp `.qml` probe file is created with `delete=False`, closed before `qmlimportscanner` runs, and `os.unlink`-ed in a `finally`. Windows keeps `NamedTemporaryFile` exclusively locked while open, so the scanner subprocess otherwise reads nothing and every QML module reports "no".
   These are build-tooling scripts, not VLC runtime source. Nathan approved the edits in the build session.
3. **Contrib Qt fully moved aside (not just the host-tool stubs).** The first session disabled only the `qmake6`/`moc` stub binaries. But the contrib bundle also ships a complete Qt 6.8.3 — 850+ headers, ~30 static libs, cmake configs, `mkspecs`, `qml/`, `plugins/` — and VLC puts `-I$(CONTRIB)/include` and `-L$(CONTRIB)/lib` on the compile line for **every** file. So `modules/gui/qt/qt.cpp` was being compiled against contrib's QtCore 6.8.3 headers *and* MSYS2's QtGui 6.11.2 private headers at the same time, which fails (`QHashCombine(size_t)` no matching constructor, plus a wall of `QT_VERSION` redefinition warnings). Fix: everything Qt in `contrib/x86_64-w64-mingw32/` is moved to `contrib/x86_64-w64-mingw32/_qt-disabled/` — `include/Qt*`, `lib/libQt6*.a`, `lib/Qt6*.prl`, `lib/cmake/Qt6*`, `lib/objects-RelWithDebInfo`, `mkspecs`, `qml`, `plugins`, `modules`, and the stray `bin/qtpaths*` / `bin/qt-*` helpers. After this, MSYS2's Qt 6.11.2 is the only Qt the build can see. `configure` was already done and still finds MSYS2 Qt, so it does not need re-running for this.
4. **Three header patches to MSYS2's Qt** (in `C:\msys64\mingw64\include\qt6\`). Stock distro Qt is not built to be consumed the way VLC's Qt module consumes it — VLC reaches into Qt private headers that the contrib build patches. VLC ships those patches in `contrib/src/qt/*.patch`; the two that block compilation apply cleanly as header-only changes (VLC never links the parts that would need Qt itself recompiled):
   - **`QtGui/6.11.2/QtGui/private/qrhid3d12_p.h`** — apply VLC's `0001-Do-not-include-D3D12MemAlloc.h-in-header-file.patch` (the `_p.h` half): replace `#include "D3D12MemAlloc.h"` (a Qt-internal vendored header MSYS2 does not ship) with forward declarations `namespace D3D12MA { struct Budget; struct Statistics; class Allocation; class Allocator; }`, and turn the inline `QD3D12Resource::releaseResources()` into a plain declaration. Every remaining `D3D12MA::` use in the header is a pointer, so forward decls suffice.
   - **`QtGui/6.11.2/QtGui/rhi/qrhi.h`** — apply VLC's `0001-Expose-QRhiImplementation-in-QRhi.patch`: add `public: QRhiImplementation* implementation() { return d; };` after the private `QRhiImplementation *d` member. `compositor_dcomp.cpp` calls `rhi->implementation()` to reach the DirectComposition device.
   A pristine copy of `qrhid3d12_p.h` was kept at `qrhid3d12_p.h.orig-msys-pkg`. All three edits are reverted by `pacman -S mingw-w64-x86_64-qt6-base` (or a `pacman -Syu`, which is the risk — a Qt update silently un-does them and the build breaks again; reapply from this note).
5. **Two edits to `modules/gui/qt/Makefile.am` — shared Qt vs. static Qt.** VLC's Qt module Makefile is written for the contrib's *static* Qt; MSYS2's Qt is *shared* (DLLs + import libs), and two things that come for free with a static Qt have to be spelled out:
   - **Link order.** `libqt_plugin_la_LIBADD` listed `$(QT_LIBS)` *before* the AOT-compiled QML archives (`$(QML_MODULE_LIBS)` = `libqml_module_player.a` etc.). `ld` processes the Qt import libs, then pulls the QML objects, which then reference Qt symbols `ld` has already passed — ~32,000 undefined references to ordinary `QString` / `QDir` / `QQmlPrivate::*` symbols. Fix: re-append `$(vlc_qt_libs)` after `$(QML_MODULE_LIBS)` (inside the existing `if ENABLE_QT` block, right after line ~1399).
   - **`-lwinmm`.** `eject.c` (compiled into the plugin via `open_panels.cpp`) calls `mciSendCommand`. Static Qt drags `-lwinmm` in through `Qt6Core`'s private pkg-config deps; shared Qt hides it. Fix: append `-lwinmm` to the `if HAVE_WIN32` `libqt_plugin_la_LIBADD` line (~line 90).
   These live in the working tree only — a fresh `git clone` will not have them, reapply from here. After editing `Makefile.am` you must re-run `./bootstrap` then `configure.sh` (below) to regenerate the Makefiles. Nathan approved both edits in the build session.

## Qt: why MSYS2's, not the contrib's

The prebuilt contrib bundle contains Qt 6.8 **target libraries** but **no host tools** — `bin/qmake6`, `bin/qmake`, etc. are 256-byte stubs pointing at `/opt/tools/bin/qmake6`, a path from VLC's CI Docker image. Building Qt host tools from source is a 1–2 h compile. Instead we install MSYS2's native Qt 6.11 and let VLC use it as a system Qt (a configuration VLC supports). The contrib's Qt host-tool stubs and its `bin/target_qt.conf` were moved to `contrib/x86_64-w64-mingw32/_qt-stubs-disabled/`, and — separately, in the second session — the entire contrib Qt tree (headers, libs, cmake, qml, plugins) was moved to `_qt-disabled/` because it was colliding with MSYS2's Qt on the global contrib include path (fix 3 above).

**Tradeoff:** VLC's contrib applies 13 patches to Qt (`contrib/src/qt/*.patch`). Two of them — `Expose-QRhiImplementation` and `Do-not-include-D3D12MemAlloc.h` — are **hard compile blockers** for VLC's Qt module and are applied by hand to the MSYS2 headers (fix 4 above). The other 11 are behaviour/runtime polish: systray notification-sound suppression, `DCompositionCreateDevice3` preference, Windows 7 compat, DirectWrite font-database/engine guards, event-dispatcher fairness, not linking D3D9, a meta-iterator `operator[]`, a macOS text/html guard. Stock MSYS2 Qt has none of these 11; VLC builds and runs without them. If the GUI misbehaves in ways that trace to them, or if the hand-patching of Qt headers turns into a maintenance problem, the real fix is to build the contrib Qt (host tools + all 13 patches) from source — `cd contrib && make -C x86_64-w64-mingw32 qt` — which is the 1–2 h compile we deferred.

## Modules disabled on this build (expected, not errors)

`configure` warns about many missing libraries. On Windows these are normal and harmless: `dbus`, `libsystemd`, wayland/xkbcommon, `libva`, `alsa`/`pulse`/`pipewire`/`jack`, `librsvg`/`cairo` (svg), `libnotify`, `gtk+-3.0`, `mmal`, `libdrm`, `protoc` (disables the Chromecast module — `protobuf` lib is present but the compiler binary is not shipped in the prebuilt contribs).

## Rebuilding a single contrib lib from source (the taglib method)

The contrib on this machine is the **prebuilt** binary bundle — `contrib/win64/` has no
`config.mak`, so `make .<pkg>` inside it fails with "No rule to make target". When one
prebuilt lib is broken (e.g. a toolchain/TLS mismatch with GCC 16.2), rebuild just that
lib from its own source and drop it over the installed copy. VLC's existing Makefiles then
link the new lib with no reconfigure. Worked example — taglib, 2026-08-29:

1. Read the version + build recipe from `contrib/src/<pkg>/rules.mak` (taglib → 2.3, CMake,
   `-DBUILD_BINDINGS=OFF`, deps utf8cpp + zlib, no patches). Check `contrib/src/<pkg>/SHA512SUMS`.
2. Download the exact tarball into `contrib/tarballs/`; verify against SHA512SUMS.
3. Back up the installed lib: `cp contrib/x86_64-w64-mingw32/lib/lib<x>.a{,.bak}`.
4. Build from the MINGW64 shell, installing into the contrib prefix:
   ```
   cmake -S <srcdir> -B build -G Ninja \
     -DCMAKE_INSTALL_PREFIX=/g/vlc/contrib/x86_64-w64-mingw32 \
     -DCMAKE_INSTALL_LIBDIR=lib \
     -DCMAKE_PREFIX_PATH=/g/vlc/contrib/x86_64-w64-mingw32 \
     -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF \
     -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DBUILD_TESTING=OFF <pkg-specific flags>
   cmake --build build && cmake --install build
   ```
   (`CMAKE_PREFIX_PATH` at the contrib prefix is what lets it find the other contrib deps —
   taglib picked up utf8cpp's cmake config and zlib from there.)
5. Force-relink just the plugin: `rm modules/.libs/lib<pkg>_plugin.dll* modules/lib<pkg>_plugin.la`,
   then `make -j4 -C modules lib<pkg>_plugin.la`. Copy the fresh `modules/.libs/lib<pkg>_plugin.dll`
   into `VLC-portable/plugins/` and re-run `vlc-cache-gen plugins`.
6. Confirm: `vlc.exe --list | grep <pkg>` shows it, and `ntldd lib<pkg>_plugin.dll` shows no
   unmet deps beyond `libvlccore.dll`.

## Packaging (after `make` produces `vlc.exe`)

`makensis` is installed (`mingw-w64-x86_64-nsis` 3.12, plus `nsis-nsisunz`) and `configure` now detects it (`MAKENSIS=/mingw64/bin/makensis`, `HAVE_MAKENSIS` true) — this is why the second `configure.sh` run mattered.

- `make package-win-strip` (or `-common`) builds the install tree under `win64/vlc-4.0.0-dev/`.
- `make package-win32-zip` / `package-win32-7zip` produce the portable archives — no extra tooling.
- `make package-win32-exe` builds the NSIS installer. **Outstanding:** its `nsProcess` helper plugin. VLC's installer stub is 32-bit (x86, Unicode) and its Makefile rule builds `nsProcess.dll` with `i686-w64-mingw32-gcc`, which is not installed (only the x86_64 toolchain is). **Decision (Nathan, this build):** patch `extras/package/win32/NSIS/vlc.win32.nsi.in` to add `Target amd64-unicode` and build `nsProcess.dll` 64-bit instead, so no 32-bit toolchain is needed. Not yet done — do it when we reach installer packaging.

## If starting over / a future session

- Scratchpad build scripts from the first runs were under the session scratchpad dir (`…/scratchpad/{build-tools,contrib-prebuilt2,cfg2,make,reconfigure,resume-make}.sh`, `luac-wrapper.sh`, `disable-contrib-qt.sh`). They are disposable — the commands and fixes in this note are the source of truth.
- **Working-tree edits a fresh `git clone` will not have** — reapply all from this note: the two `check_qml_module.py` edits, and the two `modules/gui/qt/Makefile.am` edits (fix 5). The three MSYS2 Qt header patches (fix 4) survive a reclone but not a `pacman` Qt reinstall/update.
- Disk: a full clone + tools + prebuilt contribs + build tree is ~10–15 GB. This machine had ~22 GB free mid-build.
