const api = require('../../utils/api')

Page({
  data: { stats: {}, baseUrl: '' },
  onLoad() {
    const saved = wx.getStorageSync('server_baseUrl') || api.getBaseUrl()
    this.setData({ baseUrl: saved })
  },
  onShow() { this.loadStats() },
  async loadStats() {
    try {
      const stats = await api.get('/api/stats')
      this.setData({ stats })
    } catch(e) { console.error(e) }
  },
  goToStudents() { wx.navigateTo({ url: '/pages/students/students' }) },
  goToSchedule() { wx.navigateTo({ url: '/pages/schedule/schedule' }) },
  goToAttendance() { wx.navigateTo({ url: '/pages/attendance/attendance' }) },
  goToStats() { wx.navigateTo({ url: '/pages/stats/stats' }) },
  onBaseUrlInput(e) { this.setData({ baseUrl: e.detail.value }) },
  saveBaseUrl() {
    wx.setStorageSync('server_baseUrl', this.data.baseUrl)
    const app = getApp()
    if (app && app.globalData) app.globalData.baseUrl = this.data.baseUrl
    wx.showToast({ title: '已保存', icon: 'success' })
  },
  async testBaseUrl() {
    wx.showLoading({ title: '测试中' })
    try {
      const stats = await api.get('/api/stats')
      wx.hideLoading()
      if (stats && typeof stats.total_students === 'number') {
        wx.showToast({ title: '连接成功', icon: 'success' })
        this.setData({ stats })
      } else {
        wx.showToast({ title: '响应异常', icon: 'none' })
      }
    } catch(e) {
      wx.hideLoading()
      wx.showToast({ title: '连接失败', icon: 'none' })
    }
  }
})
