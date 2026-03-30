# upload_to_ima.ps1
$clientId = Get-Content "$env:USERPROFILE\.config\ima\client_id" -ErrorAction SilentlyContinue
$apiKey = Get-Content "$env:USERPROFILE\.config\ima\api_key" -ErrorAction SilentlyContinue
$content = Get-Content "C:\Users\Lamb\Desktop\nsca\NSCA_CPT_学习指南.md" -Raw

Write-Host "准备上传到IMA..." -ForegroundColor Yellow
Write-Host "ClientID: $($clientId.Substring(0, 8))..." -ForegroundColor Gray
Write-Host "文件大小: $($content.Length) 字符" -ForegroundColor Gray

$url = "https://ima.qq.com/openapi/note/v1/import_doc"
$headers = @{
    "ima-openapi-clientid" = $clientId
    "ima-openapi-apikey" = $apiKey
    "Content-Type" = "application/json"
}

$body = @{
    content_format = 1
    content = $content
} | ConvertTo-Json -Depth 10

try {
    Write-Host "正在发送请求..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers -ContentType "application/json" -TimeoutSec 30
    Write-Host "上传成功！" -ForegroundColor Green
    $response
} catch {
    Write-Host "上传失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "错误详情: $($_.ErrorDetails.Message)" -ForegroundColor Red
}