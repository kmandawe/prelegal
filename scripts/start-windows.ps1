# Build and run the Prelegal container. Available at http://localhost:8000
$ErrorActionPreference = "Stop"

$Image = "prelegal"
$Container = "prelegal"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

Set-Location $Root

docker rm -f $Container 2>$null | Out-Null
docker build -t $Image .

$envArgs = @()
if (Test-Path ".env") {
    $envArgs = @("--env-file", ".env")
}

docker run -d --name $Container -p 8000:8000 @envArgs $Image

Write-Host "Prelegal is starting at http://localhost:8000"
