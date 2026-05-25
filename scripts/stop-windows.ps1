# Stop and remove the Prelegal container.
$ErrorActionPreference = "SilentlyContinue"

$Container = "prelegal"

docker rm -f $Container 2>$null | Out-Null

Write-Host "Prelegal stopped"
