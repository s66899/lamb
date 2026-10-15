function getBaseUrl() {
  // 优先从本地存储读取，便于用户自行修改
  const saved = wx.getStorageSync('server_baseUrl')
  if (saved) return saved
  const app = getApp()
  if (app && app.globalData && app.globalData.baseUrl) {
    return app.globalData.baseUrl
  }
  return 'http://192.168.1.100:5000'
}

function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: getBaseUrl() + url,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success: res => resolve(res.data),
      fail: err => reject(err)
    })
  })
}

module.exports = {
  getBaseUrl,
  get: (url, data) => request(url, 'GET', data),
  post: (url, data) => request(url, 'POST', data),
  put: (url, data) => request(url, 'PUT', data),
  del: (url, data) => request(url, 'DELETE', data)
}
