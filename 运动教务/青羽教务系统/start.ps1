# 羊的教务管理系统 - 一键启动脚本
# 右键点击 -> 使用 PowerShell 运行

$Host.UI.RawUI.WindowTitle = "羊的教务管理系统"

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "        羊 的 教 务 管 理 系 统" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-Python {
    Write-Host "[检查] Python 环境..." -ForegroundColor Gray -NoNewline
    try {
        $ver = python --version 2>&1
        Write-Host " OK ($ver)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host " 失败" -ForegroundColor Red
        Write-Host "[错误] 未检测到 Python，请安装 Python 3.10+ 并添加到环境变量" -ForegroundColor Red
        return $false
    }
}

function Install-Dependencies {
    Write-Host "[1/3] 检查依赖包..." -ForegroundColor Gray
    $req = Join-Path $PSScriptRoot "requirements.txt"
    if (Test-Path $req) {
        $result = python -m pip install -q -r $req 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "       OK 依赖已就绪" -ForegroundColor Green
        } else {
            Write-Host "       首次安装，请稍候..." -ForegroundColor Yellow
            python -m pip install -r $req
            Write-Host "       OK 依赖安装完成" -ForegroundColor Green
        }
    } else {
        Write-Host "       跳过 (未找到 requirements.txt)" -ForegroundColor Yellow
    }
}

function Start-Server {
    Write-Host "[2/3] 正在启动服务器..." -ForegroundColor Gray
    Write-Host "------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  访问地址: http://localhost:5000" -ForegroundColor White
    Write-Host "  停止服务: 按 Ctrl+C" -ForegroundColor White
    Write-Host "------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "[3/3] 服务运行中..." -ForegroundColor Green
    Write-Host ""

    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 2
        try { Start-Process "http://localhost:5000" } catch {}
    } | Out-Null

    $app = Join-Path $PSScriptRoot "app.py"
    try {
        python $app
    } finally {
        Write-Host ""
        Write-Host "[停止] 服务已关闭" -ForegroundColor Yellow
        Write-Host ""
        pause
    }
}

Show-Banner
if (-not (Test-Python)) {
    Read-Host "按 Enter 键退出"
    exit 1
}
Install-Dependencies
Start-Server
