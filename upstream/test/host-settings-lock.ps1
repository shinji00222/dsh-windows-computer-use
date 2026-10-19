param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference = 'Stop'
$stream = [System.IO.File]::Open($ConfigPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
try {
  [Console]::Out.WriteLine('locked')
  [Console]::Out.Flush()
  Start-Sleep -Milliseconds 1500
} finally { $stream.Dispose() }
