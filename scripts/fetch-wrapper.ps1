$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = Split-Path $PSScriptRoot -Parent
$jar = Join-Path $root 'gradle\wrapper\gradle-wrapper.jar'
$expected = '498495120a03b9a6ab5d155f5de3c8f0d986a449153702fb80fc80e134484f17'
if ((Test-Path $jar) -and (Get-FileHash $jar -Algorithm SHA256).Hash.ToLower() -eq $expected) { exit 0 }
try {
  Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/gradle/gradle/v8.9.0/gradle/wrapper/gradle-wrapper.jar' -OutFile "$jar.tmp"
  if ((Get-FileHash "$jar.tmp" -Algorithm SHA256).Hash.ToLower() -ne $expected) { throw 'Gradle Wrapper checksum mismatch.' }
  Move-Item "$jar.tmp" $jar -Force
} finally {
  if (Test-Path "$jar.tmp") { Remove-Item "$jar.tmp" -Force }
}
