/*****************************************************************************
 * plugin.c : Low-level dynamic library handling
 *****************************************************************************
 * Copyright (C) 2001-2011 VLC authors and VideoLAN
 *
 * Authors: Sam Hocevar <sam@zoy.org>
 *          Ethan C. Baldridge <BaldridgeE@cadmus.com>
 *          Hans-Peter Jansen <hpj@urpla.net>
 *          Gildas Bazin <gbazin@videolan.org>
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston MA 02110-1301, USA.
 *****************************************************************************/

#ifdef HAVE_CONFIG_H
# include "config.h"
#endif

#include <vlc_common.h>
#include <vlc_charset.h>
#include "modules/modules.h"
#include <windows.h>
#include <wchar.h>
#include <stdlib.h>

/* These LoadLibraryEx search-path flags and AddDllDirectory() are Win8+
 * (Win7 with KB2533623). VLC's baseline is Win7, so define the flags if the
 * SDK headers left them out and resolve AddDllDirectory() dynamically. */
#ifndef LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR
# define LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR 0x00000100
#endif
#ifndef LOAD_LIBRARY_SEARCH_USER_DIRS
# define LOAD_LIBRARY_SEARCH_USER_DIRS 0x00000400
#endif

char *vlc_dlerror(void)
{
    wchar_t wmsg[256];
    int i = 0, i_error = GetLastError();

    FormatMessageW( FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
                    NULL, i_error, MAKELANGID (LANG_NEUTRAL, SUBLANG_DEFAULT),
                    wmsg, 256, NULL );

    /* Go to the end of the string */
    while( !wmemchr( L"\r\n\0", wmsg[i], 3 ) )
        i++;

    snwprintf( wmsg + i, 256 - i, L" (error %i)", i_error );
    return FromWide( wmsg );
}

void *vlc_dlopen(const char *psz_file, bool lazy)
{
    wchar_t *wfile = ToWide (psz_file);
    if (wfile == NULL)
        return NULL;

    HMODULE handle = NULL;
#if WINAPI_FAMILY_PARTITION(WINAPI_PARTITION_DESKTOP)
    DWORD mode;
    if (SetThreadErrorMode (SEM_FAILCRITICALERRORS, &mode) != 0)
    {
        /* By default a plugin's dependency DLLs are resolved from System32
         * only. That is fine for the official build, whose Qt (and other
         * C++ libs) are linked statically into the plugins. A plugin built
         * against a *shared* toolchain library set (e.g. a system Qt:
         * libqt_plugin.dll needing Qt6Core.dll et al.) then fails to load.
         * Additionally allow such a plugin to pull its dependencies from
         * its own directory. */
        DWORD flags = LOAD_LIBRARY_SEARCH_SYSTEM32
                    | LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR;

        typedef void * (WINAPI *AddDllDirectory_t)(const wchar_t *);
        typedef int (WINAPI *RemoveDllDirectory_t)(void *);
        HMODULE k32 = GetModuleHandleW(L"kernel32.dll");
        AddDllDirectory_t pAddDllDirectory = k32 ? (AddDllDirectory_t)
            (void *)GetProcAddress(k32, "AddDllDirectory") : NULL;
        RemoveDllDirectory_t pRemoveDllDirectory = k32 ? (RemoveDllDirectory_t)
            (void *)GetProcAddress(k32, "RemoveDllDirectory") : NULL;

        void *cookie = NULL;
        if (pAddDllDirectory != NULL)
        {
            wchar_t *sep = wcsrchr(wfile, L'\\');
            wchar_t *slash = wcsrchr(wfile, L'/');
            if (slash != NULL && (sep == NULL || slash > sep))
                sep = slash;
            if (sep != NULL && sep != wfile)
            {
                size_t dirlen = sep - wfile;
                wchar_t *dir = malloc((dirlen + 1) * sizeof (*dir));
                if (dir != NULL)
                {
                    wmemcpy(dir, wfile, dirlen);
                    dir[dirlen] = L'\0';
                    cookie = pAddDllDirectory(dir);
                    free(dir);
                    if (cookie != NULL)
                        flags |= LOAD_LIBRARY_SEARCH_USER_DIRS;
                }
            }
        }

        handle = LoadLibraryExW(wfile, NULL, flags);

        if (cookie != NULL && pRemoveDllDirectory != NULL)
            pRemoveDllDirectory(cookie);
        SetThreadErrorMode (mode, NULL);
    }
#elif WINAPI_FAMILY_PARTITION(WINAPI_PARTITION_APP)
    handle = LoadPackagedLibrary( wfile, 0 );
#elif defined(WINAPI_FAMILY_GAMES) && (WINAPI_FAMILY == WINAPI_FAMILY_GAMES)
    // SEM_FAILCRITICALERRORS is not available on Xbox, error messages are not
    // possible. This is a sandboxed environment where the library dependencies
    // need to be managed manually per platform.
    handle = LoadLibraryExW(wfile, NULL, LOAD_LIBRARY_SEARCH_SYSTEM32);
#else
#error Unknown Windows Platform!
#endif
    free (wfile);

    (void) lazy;
    return handle;
}

int vlc_dlclose(void *handle)
{
    FreeLibrary( handle );
    return 0;
}

void *vlc_dlsym(void *handle, const char *psz_function)
{
    return GetProcAddress(handle, psz_function);
}
