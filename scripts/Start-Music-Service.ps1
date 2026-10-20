param([switch]$Check, [switch]$Stop)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stateDirectory = Join-Path $projectRoot '.music'
$secretsFile = Join-Path $stateDirectory '.env'
$composeFile = Join-Path $projectRoot 'hosting\music\compose.yaml'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Find-Docker {
    $command = Get-Command docker.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    foreach ($candidate in @(
        (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'),
        (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe')
    )) { if (Test-Path -LiteralPath $candidate) { return $candidate } }
    throw 'Install Docker Desktop for Windows x86_64 first, open it, accept its agreement yourself and wait for its Linux engine to run. Then run Start Music Service.cmd again. Setup: https://docs.docker.com/desktop/setup/install/windows-install/'
}
function Invoke-Docker([string[]]$dockerArguments) {
    & $script:dockerPath @dockerArguments
    if ($LASTEXITCODE -ne 0) { throw 'Docker could not complete the music-service operation. Check the message above. The game server was not restarted.' }
}
function New-Secret([int]$bytes) {
    $buffer = New-Object byte[] $bytes
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($buffer)).Replace('-', '').ToLowerInvariant()
}
function Set-GameMusic {
    $envFile = Join-Path $projectRoot '.env'
    $text = ''
    if (Test-Path -LiteralPath $envFile) {
        $text = [IO.File]::ReadAllText($envFile)
        $backup = Join-Path $stateDirectory ('game-env-backup-' + [Guid]::NewGuid().ToString('N'))
        [IO.File]::Copy($envFile, $backup)
    }
    $settings = [ordered]@{ MUSIC_PROVIDER = 'invidious'; MUSIC_API_URL = 'http://127.0.0.1:3001' }
    foreach ($key in $settings.Keys) {
        $line = $key + '=' + $settings[$key]
        $pattern = '(?m)^\s*' + [regex]::Escape($key) + '\s*=[^\r\n]*'
        if ([regex]::IsMatch($text, $pattern)) { $text = [regex]::Replace($text, $pattern, $line) }
        else { $text = $text.TrimEnd() + "`n" + $line + "`n" }
    }
    # All companion traffic stays behind the Invidious origin; no extra stream origins are needed.
    [IO.File]::WriteAllText($envFile, $text.TrimStart([char[]]"`r`n"), $utf8)
}

try {
    $script:dockerPath = Find-Docker
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $engineType = & $script:dockerPath info --format '{{.OSType}}' 2>$null
        $engineExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($engineExit -ne 0 -or ($engineType -join '').Trim() -ne 'linux') { throw 'Open Docker Desktop and wait for its Linux engine to start. If Windows requests WSL setup or a reboot, finish that first, then rerun this launcher.' }
    Invoke-Docker @('compose', 'version')
    if ($Check) { Write-Host 'Docker and its Linux engine are ready. No service or configuration was changed.' -ForegroundColor Green; exit 0 }
    $composeArguments = @('compose', '--project-name', 'house-rules-music', '--project-directory', $projectRoot, '--env-file', $secretsFile, '-f', $composeFile)
    if ($Stop) {
        if (-not (Test-Path -LiteralPath $secretsFile)) { Write-Host 'No private music service has been set up.'; exit 0 }
        Invoke-Docker ($composeArguments + @('stop'))
        Write-Host 'Private music stopped. Its database is retained. The game server was not stopped.'
        exit 0
    }
    [IO.Directory]::CreateDirectory($stateDirectory) | Out-Null
    if (-not (Test-Path -LiteralPath $secretsFile)) {
        $secrets = 'MUSIC_DB_PASSWORD=' + (New-Secret 24) + "`nMUSIC_COMPANION_KEY=" + (New-Secret 8) + "`nMUSIC_HMAC_KEY=" + (New-Secret 32) + "`n"
        [IO.File]::WriteAllText($secretsFile, $secrets, $utf8)
    }
    # Pinned official schema/bootstrap files; no public streaming instance is used.
    $revision = 'efcfb1ef03de9dd4d5dd74a4aec0dca2d5c0d67c'
    $files = @('docker/init-invidious-db.sh') + @('channels', 'videos', 'channel_videos', 'users', 'session_ids', 'nonces', 'annotations', 'playlists', 'playlist_videos' | ForEach-Object { 'config/sql/' + $_ + '.sql' })
    foreach ($file in $files) {
        $destination = Join-Path $stateDirectory ('invidious-source/' + $file)
        if (Test-Path -LiteralPath $destination) { continue }
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
        Write-Host ('Getting official Invidious setup file: ' + $file)
        $result = Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/iv-org/invidious/' + $revision + '/' + $file) -TimeoutSec 30
        $content = $result.Content
        if ($content -is [byte[]]) { $content = [Text.Encoding]::UTF8.GetString($content) }
        if ([string]::IsNullOrWhiteSpace($content)) { throw ('Empty setup file: ' + $file) }
        [IO.File]::WriteAllText($destination, $content.Replace("`r`n", "`n"), $utf8)
    }
    Invoke-Docker ($composeArguments + @('config', '--quiet'))
    Write-Host 'Starting private Invidious, Companion and database. The first run downloads their official container images.' -ForegroundColor Yellow
    Invoke-Docker ($composeArguments + @('up', '-d'))
    Write-Host 'Waiting for Invidious at http://127.0.0.1:3001 ...'
    $healthy = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        try {
            $status = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/v1/stats' -TimeoutSec 3
            if ($status.software.name -eq 'invidious') { $healthy = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    if (-not $healthy) { throw 'Invidious did not become ready. Its containers remain available for diagnosis. Use Stop Music Service.cmd to stop them; House Rules configuration was not changed.' }
    Set-GameMusic
    Write-Host ''
    Write-Host 'Private music service is ready. House Rules now points to it.' -ForegroundColor Green
    Write-Host 'Restart House Rules when your current game is finished, then refresh the browsers and try a music search.'
    Write-Host 'An upstream YouTube block can still prevent individual searches or streams. Use Stop Music Service.cmd when you want to stop this service.'
} catch {
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
