# Markdown转换为纯文本的简单脚本
$markdownFile = "C:\Users\Lamb\Desktop\nsca\NSCA_CPT_学习指南.md"
$txtFile = "C:\Users\Lamb\Desktop\nsca\NSCA_CPT_完整学习指南_v2.txt"

# 读取Markdown内容
$content = Get-Content $markdownFile -Raw

# 简单转换规则
# 移除Markdown标记但保持结构
$converted = $content -replace "^#{1,6}\s+", ""
$converted = $converted -replace "\*\*(.*?)\*\*", '$1'
$converted = $converted -replace "\*(.*?)\*", '$1'
$converted = $converted -replace "`[.*?`]\(.*?\)", '$1'  # 移除链接
$converted = $converted -replace "^- ", "• "  # 保持列表符号
$converted = $converted -replace "^  - ", "  • "

# 保存为txt
$converted | Out-File $txtFile -Encoding UTF8
Write-Host "转换完成：$txtFile"