# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 引擎包。

模块划分:
  paths      项目文件夹结构与注册表
  config     默认配置模板与深合并
  probe      源表自动探测(导入别人项目时用)
  core       提取 / 归并 / 三方合并 / 数据检查
  excel      Excel 输出(带手动修改保护)
  dashboard  单文件 HTML 看板生成
  server     实时监听 + 本地服务(SSE 推送)
"""

__version__ = "1.0.0"
__all__ = ["paths", "config", "probe", "core", "excel", "dashboard", "server"]
