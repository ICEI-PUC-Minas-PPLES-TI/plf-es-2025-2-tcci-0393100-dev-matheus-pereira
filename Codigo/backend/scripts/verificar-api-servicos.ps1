# =============================================================================
# Script: Verifica se a API de serviços retorna os dados corretamente
# Uso: rodar com o backend em http://localhost:8080
# Confirma o formato da resposta para validar se o front está correto.
# =============================================================================

$baseUrl = "http://localhost:8080"
$loginBody = '{"login":"josecarlos","senha":"484659"}'

Write-Host "1. Fazendo login em $baseUrl/api/auth/login ..." -ForegroundColor Cyan
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $loginBody
} catch {
    Write-Host "ERRO no login. Backend esta rodando? $baseUrl" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

$token = $loginResponse.token
if (-not $token) {
    Write-Host "ERRO: Resposta do login nao trouxe 'token'." -ForegroundColor Red
    Write-Host ($loginResponse | ConvertTo-Json -Depth 3)
    exit 1
}
Write-Host "   Login OK. Token obtido." -ForegroundColor Green

Write-Host "`n2. Chamando GET $baseUrl/api/servicos ..." -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }
try {
    $servicos = Invoke-RestMethod -Uri "$baseUrl/api/servicos" -Headers $headers -Method Get
} catch {
    Write-Host "ERRO ao listar servicos." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

$count = if ($servicos -is [array]) { $servicos.Count } else { 0 }
Write-Host "   Total de servicos retornados: $count" -ForegroundColor Green

Write-Host "`n3. Formato da resposta (para o front conferir):" -ForegroundColor Cyan
Write-Host "   - Tipo: array de objetos JSON" -ForegroundColor Gray
Write-Host "   - Cada item deve ter: servicoId, nome, descricao, valorPadrao, ativo" -ForegroundColor Gray
$servicos | ConvertTo-Json -Depth 4

Write-Host "`n4. Resumo: se o front chama GET /api/servicos com header Authorization: Bearer <token>" -ForegroundColor Yellow
Write-Host "   e trata a resposta como array com campos acima, esta correto." -ForegroundColor Yellow
