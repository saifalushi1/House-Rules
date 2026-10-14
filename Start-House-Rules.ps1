$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Install Node.js 22 or newer from https://nodejs.org, then run this launcher again.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\ws'))) {
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCommand) { & $npmCommand.Source install }
  else {
    $pnpmPath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
    if (-not (Test-Path -LiteralPath $pnpmPath)) { throw 'Dependencies are missing. Install Node.js, then run npm install in this folder.' }
    $env:PATH = (Split-Path -Parent $nodePath) + ';' + $env:PATH
    & $pnpmPath install --ignore-scripts
  }
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check the terminal output above.' }
}
if (-not (Test-Path -LiteralPath 'dist\index.html') -or -not (Test-Path -LiteralPath 'dist-server\server\index.js')) {
  & $nodePath scripts\build.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Build failed. Check the terminal output above.' }
}
Write-Host ''
Write-Host 'HOUSE RULES - Your table. Your rules.' -ForegroundColor Yellow
Write-Host 'Open http://localhost:3000 in your browser. Keep this window open while playing.'
Write-Host 'The Wi-Fi invite address is printed below. Press Ctrl+C to stop.'
Write-Host ''
& $nodePath dist-server\server\index.js
