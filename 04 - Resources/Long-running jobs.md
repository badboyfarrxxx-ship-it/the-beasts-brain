---
status: active
project: meta
type: reference
created: 2026-09-13
---
# Long-running jobs

How to run anything that takes more than a few minutes (Defender scans, big copies, builds) so
it survives the Claude Code session ending. Learned the hard way on 2026-09-12 and 09-13.

## The rule: launch detached, log to a file

Claude Code's own background tasks (`run_in_background`) **die when the session ends**. On
09-12 and 09-13 that killed a drive scan three times and a backup once, each hours in.

Launch the job as its own Windows process instead, with a hidden window, and have it write
everything to a log file:

```powershell
$jobDir = 'C:\Users\badbo\AppData\Local\Temp\beast-jobs'
Set-Content "$jobDir\job.ps1" -Value $script -Encoding UTF8
Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$jobDir\job.ps1" -WindowStyle Hidden -PassThru
```

- Scripts and logs live in `%TEMP%\beast-jobs\`, a fixed path any later session can read. The
  session scratchpad changes every session, so don't use it for this.
- Inside the script, send every result line to the log (`Out-File -Append`). Nothing reaches
  the console.
- Record the PID and the log path in today's daily note the moment it launches. The next
  session checks on it with `Get-Process -Id <pid>` and by reading the log.
- Make jobs safe to re-run: robocopy skips files it already copied, so a killed copy just gets
  relaunched.

## Traps

- **OneDrive placeholders.** Most of `C:\Users\badbo\OneDrive` is online-only (on 09-13, 1,411
  of 1,452 files). Reading them either downloads them or, with OneDrive not running, fails with
  `ERROR 362 The cloud file provider is not running` and robocopy retries every file. Skip them
  (attribute bits `0x400000` recall-on-access, `0x1000` offline). They're in the cloud already.
- **Defender report-only scans** (`MpCmdRun -Scan -ScanType 3 -File <path> -DisableRemediation`)
  write no Defender events, and `%TEMP%\MpCmdRun.log` only records counts. **The threat names
  exist only in the console output**, so capture all of it (`2>&1 | Out-File`) and never trim
  it with `Select-Object -Last N`, which cut the list and undercounted on 09-12. Exit code 2
  means threats were found, not that the scan failed.
- A folder scan over the USB Seagate runs at roughly 1 to 2 hours per 10 to 20 GB of small
  files, so expect whole evenings for big crack folders.

## Related

- [[Security incident 2026-09-12]]: where these jobs came from.
- [[Machine drives]]: which drive letter is which.
