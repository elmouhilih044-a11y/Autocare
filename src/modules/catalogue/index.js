// العقد العام لموديول الكتالوج (Catalogue Public Contract)
function createCatalogueApi({ catalogueService }) {
  return {
    // جلب تفاصيل رحلة معينة (مع دعم المعاملات Transaction Session)
    async getDeparture(id, options = {}) {
      return catalogueService.getDepartureById(id, options);
    },

    // حراسة الرحلة والتحقق من حالتها مع زيادة الـ revision (INV-1 & Concurrency Guard)
    async guardDeparture(id, expectedStatus, options = {}) {
      return catalogueService.guardDeparture(id, expectedStatus, options);
    },

    // انتقالات الحالة الخاصة بالرحلة
    async startBoarding(id, options = {}) {
      return catalogueService.updateStatus(id, 'BOARDING', options);
    },

    async depart(id, options = {}) {
      return catalogueService.updateStatus(id, 'DEPARTED', options);
    },

    async cancel(id, options = {}) {
      return catalogueService.updateStatus(id, 'CANCELLED', options);
    },
  };
}

module.exports = { createCatalogueApi };