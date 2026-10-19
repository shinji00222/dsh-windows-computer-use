# Live fixture owns its entire window and closes only itself. No physical input.
param([string]$ArtifactDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility') -Force
[Console]::WriteLine('{"phase":"utility-loaded"}')
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @'
public class InactiveFixtureForm : System.Windows.Forms.Form {
  protected override bool ShowWithoutActivation {get {return true;}}
}
'@
[Console]::WriteLine('{"phase":"form-type-compiled"}')
$form=New-Object InactiveFixtureForm
$form.Text='WCU issue18 isolated native fixture'
$form.Width=500;$form.Height=300
$edit=New-Object System.Windows.Forms.TextBox
$edit.Name='fixture-edit';$edit.Text='native needle';$edit.Width=200;$edit.Top=40;$edit.Left=20
$button=New-Object System.Windows.Forms.Button
$button.Text='Fixture button';$button.Top=80;$button.Left=20
$form.Controls.Add($edit);$form.Controls.Add($button)
$timer=New-Object System.Windows.Forms.Timer
$timer.Interval=100
$script:last=0
$timer.Add_Tick({
  $file=Join-Path $ArtifactDirectory 'native-command.json'
  if (-not [IO.File]::Exists($file)) {return}
  try {$command=[IO.File]::ReadAllText($file,[Text.Encoding]::UTF8)|ConvertFrom-Json} catch {return}
  if ($command.id -eq $script:last) {return};$script:last=$command.id
  if ($command.action -eq 'hang') {
    [Console]::WriteLine('{"hanging":true}')
    [Threading.Thread]::Sleep(3000)
    [Console]::WriteLine('{"recovered":true}')
  }
  if ($command.action -eq 'quit') {$form.Close()}
})
$form.Add_Shown({
  [Console]::WriteLine((@{ready=$true;hwnd=$form.Handle.ToInt64();pid=$PID}|ConvertTo-Json -Compress))
  $timer.Start()
})
[Windows.Forms.Application]::Run($form)
$timer.Dispose();$form.Dispose()
