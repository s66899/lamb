App({
  globalData: {
    baseUrl: ''
  },
  onLaunch() {
    // 优先从本地存储读取服务器地址，默认使用本地局域网地址
    const saved = wx.getStorageSync('server_baseUrl')
    this.globalData.baseUrl = saved || 'http://192.168.1.100:5000'
  }
})
