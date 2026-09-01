---
status: active
project: meta
type: index
---
# vlc-source-patches

The two patched VLC source files that make the locally-built VLC 4.0 dev GUI run
with MSYS2's shared Qt. Recovered 2026-09-02 from Windows File History after the
drive holding the VLC source tree (`G:\vlc`) died. Kept here so they survive even
though the source tree itself is gone.

| file | patched size | what it is |
|------|-------------|------------|
| `plugin.c` | 5491 bytes | `src/win32/plugin.c`. `vlc_dlopen()` also `AddDllDirectory()`s the plugin's own folder and loads with `LOAD_LIBRARY_SEARCH_USER_DIRS \| LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR`, so a plugin resolves its dependency DLLs from beside itself. |
| `winvlc.c` | 8428 bytes | `bin/winvlc.c`. `SetDefaultDllDirectories` changed from `SEARCH_SYSTEM32` to `SEARCH_DEFAULT_DIRS \| SEARCH_DLL_LOAD_DIR`, so Qt's own QML plugin loader finds the Qt DLLs next to `vlc.exe`. |

Both carry `#ifndef` fallbacks for the flag constants (Win7 floor) and were
captured by File History at the `2026_08_29 02_24_57 UTC` snapshot, which is
after both patches were applied that day.

Full rationale and the rebuild path are in [[Building VLC for Windows]]. If VLC
is ever rebuilt from a fresh clone, drop these two files in over the stock ones
(or reapply by hand from the descriptions in that note).
