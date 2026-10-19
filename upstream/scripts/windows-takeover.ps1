param([Parameter(Mandatory=$true)][string]$CancelEvent, [switch]$TestMode)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
  Add-Type -AssemblyName System.Windows.Forms, System.Drawing, System.Web.Extensions
  $source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'windows-takeover.cs'), [Text.Encoding]::UTF8)
  Add-Type -TypeDefinition $source -ReferencedAssemblies System.Windows.Forms,System.Drawing,System.Web.Extensions
  [DshTakeover.Host]::Run($CancelEvent, [bool]$TestMode)
} catch {
  [Console]::Error.WriteLine($_.Exception.ToString())
  exit 1
}
